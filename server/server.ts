import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { filterReviews, summarizeReviews } from "./analytics.js";
import { demoProperties, demoReviews } from "./data.js";
import { answerOperationsQuestion, analyzeReviews, isAiConfigured } from "./insights.js";
import { PropertyModel, ReviewModel } from "./models.js";
import { parseReviewCsv, stringifyReviews } from "./review-import.js";
import type { GuestReview } from "../lib/types";

dotenv.config({ path: [".env.local", ".env"] });

export const app = express();
const port = Number(process.env.API_PORT || 4000);
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());
if (process.env.VERCEL === "1") app.set("trust proxy", 1);
const isMongoConnected = () => mongoose.connection.readyState === 1;
const isMongoConfigured = () => Boolean(process.env.MONGODB_URI);
let mongoConnectionMessage: string | null = null;
const allowedSentiments = ["positive", "mixed", "negative", "unanalysed"];

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "64kb" }));
app.use(
  ["/api/insights", "/api/assistant"],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "AI request limit reached. Try again in 15 minutes." },
  }),
);

function statusError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

function requireMongo() {
  if (!isMongoConnected()) {
    throw statusError("Review management requires a configured, connected MongoDB database.", 503);
  }
}

async function loadProperties() {
  if (!isMongoConnected()) return demoProperties;
  const rows = await PropertyModel.find().select("-_id -__v").lean().exec();
  return rows as unknown as typeof demoProperties;
}

function normalizeReview(review: GuestReview): GuestReview {
  return {
    ...review,
    isDemo: review.isDemo === true,
    source: review.source ?? (review.isDemo ? "demo" : "manual"),
    sentiment: review.sentiment ?? "unanalysed",
    analysisStatus: review.analysisStatus ?? (review.isDemo ? "complete" : "unanalysed"),
    analysisProvider: review.analysisProvider ?? (review.isDemo ? "Synthetic demo labels" : undefined),
    topics: review.topics ?? [],
  };
}

async function loadReviews() {
  if (!isMongoConnected()) return demoReviews;
  const rows = await ReviewModel.find().select("-_id -__v").sort({ date: -1 }).lean().exec();
  return (rows as unknown as GuestReview[]).map(normalizeReview);
}

function reviewFilter(request: Request, properties: typeof demoProperties) {
  const propertyId = typeof request.query.propertyId === "string" ? request.query.propertyId : undefined;
  if (propertyId && !properties.some((property) => property.id === propertyId)) {
    throw statusError("Unknown propertyId.", 400);
  }
  const sentiment = typeof request.query.sentiment === "string" ? request.query.sentiment : undefined;
  if (sentiment && !["all", ...allowedSentiments].includes(sentiment)) {
    throw statusError(`sentiment must be one of: ${["all", ...allowedSentiments].join(", ")}.`, 400);
  }
  const replyStatus = typeof request.query.replyStatus === "string" ? request.query.replyStatus : undefined;
  if (replyStatus && !["all", "Replied", "Needs reply"].includes(replyStatus)) {
    throw statusError("replyStatus must be all, Replied, or Needs reply.", 400);
  }
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const from = typeof request.query.from === "string" ? request.query.from : undefined;
  const to = typeof request.query.to === "string" ? request.query.to : undefined;
  if (from && !isValidDate(from)) throw statusError("from must be a valid YYYY-MM-DD date.", 400);
  if (to && !isValidDate(to)) throw statusError("to must be a valid YYYY-MM-DD date.", 400);
  return { propertyId, sentiment, replyStatus, search, from, to };
}

function mongoReviewFilter(filters: ReturnType<typeof reviewFilter>, properties: typeof demoProperties) {
  const query: Record<string, unknown> = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.sentiment && filters.sentiment !== "all") query.sentiment = filters.sentiment;
  if (filters.replyStatus && filters.replyStatus !== "all") query.replyStatus = filters.replyStatus;
  if (filters.from || filters.to) {
    query.date = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchesProperty = properties
      .filter((property) => `${property.name} ${property.location}`.toLowerCase().includes(filters.search.toLowerCase()))
      .map((property) => property.id);
    const searchClauses: Record<string, unknown>[] = ["guestName", "country", "title", "positive", "negative", "topics", "sourceRef"].map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    }));
    if (matchesProperty.length) searchClauses.push({ propertyId: { $in: matchesProperty } });
    query.$or = searchClauses;
  }
  return query;
}

function validateReviewBody(body: unknown, properties: typeof demoProperties) {
  if (!body || typeof body !== "object") throw statusError("A JSON review body is required.", 400);
  const value = body as Record<string, unknown>;
  if (typeof value.propertyId !== "string" || !properties.some((property) => property.id === value.propertyId)) {
    throw statusError("Choose one of the configured Azzurro properties.", 400);
  }
  const score = typeof value.score === "number" ? value.score : Number(value.score);
  if (!Number.isFinite(score) || score < 0 || score > 10) throw statusError("score must be from 0 to 10.", 400);
  if (typeof value.date !== "string" || !isValidDate(value.date)) {
    throw statusError("date must use YYYY-MM-DD.", 400);
  }
  const text = (key: string, fallback: string, max: number) => {
    const field = value[key];
    if (field !== undefined && typeof field !== "string") throw statusError(`${key} must be text.`, 400);
    const normalized = typeof field === "string" ? field.trim() : "";
    if (normalized.length > max) throw statusError(`${key} is too long.`, 400);
    return normalized || fallback;
  };
  return {
    propertyId: value.propertyId,
    guestName: text("guestName", "Not provided", 120),
    country: text("country", "Not provided", 100),
    date: value.date,
    stay: text("stay", "Stay details not provided", 120),
    score,
    title: text("title", "Guest review", 300),
    positive: text("positive", "", 12_000),
    negative: text("negative", "", 12_000),
  } satisfies Pick<GuestReview, "propertyId" | "guestName" | "country" | "date" | "stay" | "score" | "title" | "positive" | "negative">;
}

function sendError(error: unknown, response: Response) {
  console.error("API request failed:", error);
  const status =
    error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : error instanceof mongoose.Error.ValidationError
        ? 400
        : error instanceof mongoose.Error
          ? 500
          : error instanceof Error && error.message.includes("duplicate key")
            ? 409
            : 500;
  const message =
    status === 500
      ? "The dashboard request could not be completed. Check the API logs for details."
      : error instanceof Error
        ? error.message
        : "The request could not be completed.";
  response.status(status).json({ error: message });
}

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    storage: isMongoConnected() ? "mongodb" : "demo-memory",
    aiConfigured: isAiConfigured(),
    reviewManagementAvailable: isMongoConnected(),
    databaseMessage: mongoConnectionMessage,
  });
});

app.get("/api/dashboard", async (_request, response, next) => {
  try {
    const [properties, reviews] = await Promise.all([loadProperties(), loadReviews()]);
    const summary = summarizeReviews(reviews, properties);
    response.json({
      demoData: reviews.length > 0 && reviews.every((review) => review.isDemo),
      containsDemoData: reviews.some((review) => review.isDemo),
      properties: summary.propertyStats,
      reviews: reviews.slice(0, 500),
      trend: summary.trend,
      integrations: {
        storage: isMongoConnected() ? "mongodb" : "demo-memory",
        aiConfigured: isAiConfigured(),
        databaseMessage:
          mongoConnectionMessage ??
          (isMongoConfigured() ? null : "Set MONGODB_URI to enable database-backed review management."),
      },
      summary: {
        total: summary.total,
        average: summary.average,
        analyzed: summary.analyzed,
        positive: summary.positive,
        negative: summary.negative,
        mixed: summary.mixed,
        needsReply: reviews.filter((review) => review.replyStatus === "Needs reply").length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/properties", async (_request, response, next) => {
  try {
    const [properties, reviews] = await Promise.all([loadProperties(), loadReviews()]);
    response.json(summarizeReviews(reviews, properties).propertyStats);
  } catch (error) {
    next(error);
  }
});

app.get("/api/reviews", async (request, response, next) => {
  try {
    const properties = await loadProperties();
    const filters = reviewFilter(request, properties);
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(request.query.limit) || 100));
    if (isMongoConnected()) {
      const filter = mongoReviewFilter(filters, properties);
      const [reviews, total] = await Promise.all([
        ReviewModel.find(filter).select("-_id -__v").sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
        ReviewModel.countDocuments(filter),
      ]);
      response.json({ reviews: (reviews as unknown as GuestReview[]).map(normalizeReview), total, page, limit });
      return;
    }
    const reviews = filterReviews(await loadReviews(), { ...filters, properties })
      .filter((review) => (!filters.replyStatus || filters.replyStatus === "all" || review.replyStatus === filters.replyStatus))
      .filter((review) => (!filters.from || review.date >= filters.from) && (!filters.to || review.date <= filters.to))
      .sort((a, b) => b.date.localeCompare(a.date));
    response.json({ reviews: reviews.slice((page - 1) * limit, page * limit), total: reviews.length, page, limit });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reviews", async (request, response, next) => {
  try {
    requireMongo();
    const properties = await loadProperties();
    const input = validateReviewBody(request.body, properties);
    const review = await ReviewModel.create({
      ...input,
      id: randomUUID(),
      sentiment: "unanalysed",
      replyStatus: "Needs reply",
      isDemo: false,
      source: "manual",
      analysisStatus: "unanalysed",
      topics: [],
    });
    response.status(201).json(normalizeReview(review.toObject() as GuestReview));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/reviews/:id", async (request, response, next) => {
  try {
    requireMongo();
    const body = request.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.replyStatus !== undefined) {
      if (!["Replied", "Needs reply"].includes(String(body.replyStatus))) {
        throw statusError("replyStatus must be Replied or Needs reply.", 400);
      }
      update.replyStatus = body.replyStatus;
    }
    for (const field of ["title", "positive", "negative"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || body[field].length > 12_000) {
          throw statusError(`${field} must be text no longer than 12,000 characters.`, 400);
        }
        update[field] = body[field];
      }
    }
    if (body.score !== undefined) {
      const score = Number(body.score);
      if (!Number.isFinite(score) || score < 0 || score > 10) throw statusError("score must be from 0 to 10.", 400);
      update.score = score;
    }
    if (Object.keys(update).length === 0) throw statusError("Provide at least one supported review field.", 400);
    if ("title" in update || "positive" in update || "negative" in update) {
      Object.assign(update, {
        sentiment: "unanalysed",
        analysisStatus: "unanalysed",
        analysisProvider: undefined,
        analyzedAt: undefined,
        topics: [],
      });
    }
    const review = await ReviewModel.findOneAndUpdate({ id: request.params.id }, update, {
      new: true,
      runValidators: true,
    }).lean().exec();
    if (!review) throw statusError("Review not found.", 404);
    response.json(normalizeReview(review as unknown as GuestReview));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/reviews/:id", async (request, response, next) => {
  try {
    requireMongo();
    const deleted = await ReviewModel.findOneAndDelete({ id: request.params.id }).lean().exec();
    if (!deleted) throw statusError("Review not found.", 404);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/reviews/import",
  express.text({ type: ["text/csv", "application/csv"], limit: "2mb" }),
  async (request, response, next) => {
    try {
      requireMongo();
      if (typeof request.body !== "string") throw statusError("Upload CSV text using a text/csv content type.", 415);
      const properties = await loadProperties();
      let reviews: GuestReview[];
      try {
        reviews = parseReviewCsv(request.body, properties);
      } catch (error) {
        if (error instanceof Error) throw statusError(error.message, 400);
        throw error;
      }
      if (reviews.some((review) => review.sourceRef)) {
        const refs = reviews.flatMap((review) =>
          review.sourceRef ? [{ propertyId: review.propertyId, sourceRef: review.sourceRef }] : [],
        );
        const duplicates = await ReviewModel.countDocuments({ $or: refs });
        if (duplicates > 0) {
          throw statusError("Import contains sourceRef values already stored for these properties; no rows were saved.", 409);
        }
      }
      await ReviewModel.insertMany(reviews, { ordered: true });
      response.status(201).json({
        imported: reviews.length,
        message: "Reviews imported and saved. They remain unanalysed until an AI analysis is run.",
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/reviews/export", async (request, response, next) => {
  try {
    const properties = await loadProperties();
    const filters = reviewFilter(request, properties);
    const reviews = isMongoConnected()
      ? ((await ReviewModel.find(mongoReviewFilter(filters, properties))
          .select("-_id -__v")
          .sort({ date: -1 })
          .limit(10_000)
          .lean()
          .exec()) as unknown as GuestReview[]).map(normalizeReview)
      : filterReviews(await loadReviews(), { ...filters, properties })
          .filter((review) => (!filters.replyStatus || filters.replyStatus === "all" || review.replyStatus === filters.replyStatus))
          .filter((review) => (!filters.from || review.date >= filters.from) && (!filters.to || review.date <= filters.to));
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="azzurro-reviews.csv"');
    response.send(`\uFEFF${stringifyReviews(reviews)}`);
  } catch (error) {
    next(error);
  }
});

app.post("/api/insights", async (request, response, next) => {
  try {
    requireMongo();
    if (!isAiConfigured()) throw statusError("AI analysis is unavailable. Configure OPENAI_API_KEY and try again.", 503);
    const properties = await loadProperties();
    const propertyId = typeof request.body?.propertyId === "string" ? request.body.propertyId : undefined;
    if (propertyId && !properties.some((property) => property.id === propertyId)) {
      throw statusError("Unknown propertyId.", 400);
    }
    const selected = await ReviewModel.find(propertyId ? { propertyId } : {})
      .select("-_id -__v")
      .sort({ date: -1 })
      .limit(120)
      .lean()
      .exec();
    const reviews = (selected as unknown as GuestReview[]).map(normalizeReview);
    const propertyName = properties.find((property) => property.id === propertyId)?.name ?? "Azzurro Hotels portfolio";
    const result = await analyzeReviews(reviews, propertyName, reviews.some((review) => review.isDemo));
    await ReviewModel.bulkWrite(
      result.classifications.map((classification) => ({
        updateOne: {
          filter: { id: classification.reviewId },
          update: {
            $set: {
              sentiment: classification.sentiment,
              topics: classification.topics,
              analysisStatus: "complete",
              analysisProvider: result.insights.provider,
              analyzedAt: new Date().toISOString(),
            },
          },
        },
      })),
    );
    response.json(result.insights);
  } catch (error) {
    next(error);
  }
});

app.post("/api/assistant", async (request, response, next) => {
  try {
    requireMongo();
    if (!isAiConfigured()) throw statusError("The Operations Assistant is unavailable. Configure OPENAI_API_KEY to enable it.", 503);
    const question = request.body?.question;
    if (typeof question !== "string" || !question.trim() || question.length > 1000) {
      throw statusError("Ask a question between 1 and 1,000 characters.", 400);
    }
    const properties = await loadProperties();
    const propertyId = typeof request.body?.propertyId === "string" ? request.body.propertyId : undefined;
    if (propertyId && !properties.some((property) => property.id === propertyId)) {
      throw statusError("Unknown propertyId.", 400);
    }
    const query: Record<string, unknown> = propertyId ? { propertyId } : {};
    const stored = await ReviewModel.find(query).select("-_id -__v").sort({ date: -1 }).limit(80).lean().exec();
    const reviews = (stored as unknown as GuestReview[]).map(normalizeReview);
    const propertyName = properties.find((property) => property.id === propertyId)?.name ?? "All Azzurro properties";
    const answer = await answerOperationsQuestion({
      question: question.trim(),
      reviews,
      propertyName,
      demoData: reviews.some((review) => review.isDemo),
    });
    response.json(answer);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  sendError(error, response);
});

let initialization: Promise<void> | null = null;

export function initialize() {
  if (!initialization) initialization = initializeDatabase();
  return initialization;
}

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    } catch (error) {
      const message =
        error instanceof Error && /authentication failed|bad auth/i.test(error.message)
          ? "MongoDB authentication failed. Check the Atlas database username and password, and URL-encode any reserved password characters."
          : "MongoDB connection failed. Check the connection URI, Atlas network access list, and cluster status.";
      mongoConnectionMessage = message;
      console.error(message);
    }
    if (isMongoConnected()) {
      await PropertyModel.bulkWrite(
        demoProperties.map((property) => ({
          updateOne: { filter: { id: property.id }, update: { $set: property }, upsert: true },
        })),
      );
      await PropertyModel.deleteMany({
        id: { $in: ["casa-luce", "palazzo-azzurro", "cala-serena", "villa-ortica"] },
      });
      await ReviewModel.deleteMany({
        propertyId: { $in: ["casa-luce", "palazzo-azzurro", "cala-serena", "villa-ortica"] },
        isDemo: true,
      });
      if ((await ReviewModel.countDocuments()) === 0) await ReviewModel.insertMany(demoReviews);
      console.info("Connected to MongoDB; demo reviews are seeded only when the review collection is empty.");
    }
  } else {
    mongoConnectionMessage = "Set MONGODB_URI to enable database-backed review management.";
    console.warn(mongoConnectionMessage);
  }
}

async function start() {
  await initialize();
  app.listen(port, () => console.info(`Azzurro insights API listening on port ${port}.`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((error: unknown) => {
    console.error("API startup failed:", error);
    process.exitCode = 1;
  });
}
