import OpenAI from "openai";
import type { GuestReview, OperationsAnswer, ReviewInsights, Sentiment } from "../lib/types";

type ReviewClassification = {
  reviewId: string;
  sentiment: Exclude<Sentiment, "unanalysed">;
  topics: string[];
};

type AnalysisResponse = {
  summary: string;
  strengths: string[];
  friction: string[];
  suggestions: string[];
  themes: { name: string; mentions: number; sentiment: Exclude<Sentiment, "unanalysed"> }[];
  classifications: ReviewClassification[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function boundedStrings(value: unknown): value is string[] {
  return isStringArray(value) && value.length <= 10 && value.every((item) => item.length <= 500);
}

function validateAnalysis(value: unknown, reviewIds: Set<string>): AnalysisResponse {
  if (!value || typeof value !== "object") throw new Error("The AI provider returned an invalid analysis response.");
  const result = value as Record<string, unknown>;
  if (
    typeof result.summary !== "string" ||
    result.summary.length > 2000 ||
    !boundedStrings(result.strengths) ||
    !boundedStrings(result.friction) ||
    !boundedStrings(result.suggestions) ||
    !Array.isArray(result.themes) ||
    !Array.isArray(result.classifications)
  ) {
    throw new Error("The AI provider returned an incomplete analysis response.");
  }
  const classifications = result.classifications.map((classification) => {
    if (!classification || typeof classification !== "object") {
      throw new Error("The AI provider returned an invalid review classification.");
    }
    const item = classification as Record<string, unknown>;
    if (
      typeof item.reviewId !== "string" ||
      !reviewIds.has(item.reviewId) ||
      !["positive", "mixed", "negative"].includes(String(item.sentiment)) ||
      !isStringArray(item.topics) ||
      item.topics.length < 1 ||
      item.topics.length > 5 ||
      item.topics.some((topic) => !topic.trim() || topic.length > 80)
    ) {
      throw new Error("The AI provider returned an invalid review classification.");
    }
    return {
      reviewId: item.reviewId,
      sentiment: item.sentiment as Exclude<Sentiment, "unanalysed">,
      topics: [...new Set(item.topics.map((topic) => topic.trim()))],
    };
  });
  if (new Set(classifications.map((item) => item.reviewId)).size !== reviewIds.size) {
    throw new Error("The AI provider did not classify every selected review.");
  }
  const topicStats = new Map<string, { name: string; mentions: number; sentiments: Record<Exclude<Sentiment, "unanalysed">, number> }>();
  for (const classification of classifications) {
    for (const topic of new Set(classification.topics.map((value) => value.toLocaleLowerCase()))) {
      const current = topicStats.get(topic) ?? {
        name: classification.topics.find((value) => value.toLocaleLowerCase() === topic)!,
        mentions: 0,
        sentiments: { positive: 0, mixed: 0, negative: 0 },
      };
      current.mentions += 1;
      current.sentiments[classification.sentiment] += 1;
      topicStats.set(topic, current);
    }
  }
  const themes = [...topicStats.values()]
    .map(({ name, mentions, sentiments }) => ({
      name,
      mentions,
      sentiment:
        sentiments.positive > sentiments.negative && sentiments.positive > sentiments.mixed
          ? "positive" as const
          : sentiments.negative > sentiments.positive && sentiments.negative > sentiments.mixed
            ? "negative" as const
            : "mixed" as const,
    }))
    .sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name))
    .slice(0, 12);
  return {
    summary: result.summary,
    strengths: result.strengths,
    friction: result.friction,
    suggestions: result.suggestions,
    themes,
    classifications,
  };
}

function getClient() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const apiKey = geminiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("AI analysis is unavailable. Configure GEMINI_API_KEY or OPENAI_API_KEY and try again.");
    Object.assign(error, { status: 503 });
    throw error;
  }
  return new OpenAI({
    apiKey,
    ...(geminiKey
      ? { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }
      : process.env.OPENAI_BASE_URL
        ? { baseURL: process.env.OPENAI_BASE_URL }
        : {}),
    timeout: 30_000,
    maxRetries: 1,
  });
}

function configuredModel() {
  return process.env.GEMINI_API_KEY
    ? process.env.GEMINI_MODEL || "gemini-3-flash-preview"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function completeJson<T>(system: string, user: unknown, validate: (value: unknown) => T): Promise<T> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: configuredModel(),
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("The AI provider returned an empty response.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The AI provider returned invalid JSON.");
  }
  return validate(parsed);
}

export async function analyzeReviews(
  reviews: GuestReview[],
  propertyName: string,
  demoData: boolean,
): Promise<{ insights: ReviewInsights; classifications: ReviewClassification[] }> {
  if (reviews.length === 0) {
    const error = new Error("There are no reviews in this selection to analyze.");
    Object.assign(error, { status: 422 });
    throw error;
  }
  const reviewIds = new Set(reviews.map((review) => review.id));
  const analysis = await completeJson(
    "You are a hotel operations analyst. Only infer from supplied review records; they may be synthetic demo data. Never claim Booking.com provenance. Do not invent reviews, issues, proportions, or operational facts. Return JSON: summary string; strengths, friction, suggestions string arrays; themes array of {name, mentions, sentiment}; classifications array containing exactly one item per supplied review with {reviewId, sentiment (positive|mixed|negative), topics (1-5 concise phrases)}. Keep suggestions proportionate to the sample. Never include guest names. Preserve each reviewId exactly.",
    {
      property: propertyName,
      reviews: reviews.map(({ id, date, score, title, positive, negative }) => ({
        reviewId: id,
        date,
        score,
        title: title.slice(0, 300),
        positive: positive.slice(0, 600),
        negative: negative.slice(0, 600),
      })),
    },
    (value) => validateAnalysis(value, reviewIds),
  );
  const { classifications, ...payload } = analysis;
  return {
    classifications,
    insights: {
      ...payload,
      demoData,
      reviewCount: classifications.length,
      provider: configuredModel(),
    },
  };
}

export async function answerOperationsQuestion(input: {
  question: string;
  reviews: GuestReview[];
  propertyName: string;
  demoData: boolean;
}): Promise<OperationsAnswer> {
  const { question, reviews, propertyName, demoData } = input;
  if (reviews.length === 0) {
    const error = new Error("There are no stored reviews in this selection to answer from.");
    Object.assign(error, { status: 422 });
    throw error;
  }
  const knownIds = new Set(reviews.map((review) => review.id));
  const result = await completeJson(
    "You are an operations assistant for hotel management. Answer only from the provided review records and computed metrics. The reviews may be synthetic demo data. Never imply Booking.com integration or present guesses as facts. If evidence is insufficient, say so. Return JSON with answer (string) and evidence (array of {reviewId, quote}); cite only provided review IDs and exact short excerpts from those records. Do not include guest names or external facts.",
    {
      question,
      property: propertyName,
      records: reviews.map(({ id, propertyId, date, score, sentiment, title, positive, negative }) => ({
        reviewId: id,
        propertyId,
        date,
        score,
        sentiment,
        title: title.slice(0, 300),
        positive: positive.slice(0, 600),
        negative: negative.slice(0, 600),
      })),
    },
    (value) => {
      if (!value || typeof value !== "object") throw new Error("The assistant returned an invalid response.");
      const response = value as Record<string, unknown>;
      if (typeof response.answer !== "string" || response.answer.length > 4000 || !Array.isArray(response.evidence) || response.evidence.length > 8) {
        throw new Error("The assistant returned an incomplete response.");
      }
      const evidence = response.evidence.map((entry) => {
        if (!entry || typeof entry !== "object") throw new Error("The assistant returned invalid evidence.");
        const item = entry as Record<string, unknown>;
        if (
          typeof item.reviewId !== "string" ||
          !knownIds.has(item.reviewId) ||
          typeof item.quote !== "string" ||
          item.quote.length > 500
        ) {
          throw new Error("The assistant cited a review outside the selected dataset.");
        }
        const review = reviews.find((candidate) => candidate.id === item.reviewId)!;
        const source = `${review.title} ${review.positive} ${review.negative}`;
        if (!source.includes(item.quote)) throw new Error("The assistant returned a quote that is not in the source review.");
        return {
          reviewId: review.id,
          propertyName: propertyName || review.propertyId,
          date: review.date,
          quote: item.quote,
        };
      });
      return { answer: response.answer, evidence };
    },
  );
  return {
    ...result,
    reviewCount: reviews.length,
    provider: configuredModel(),
    demoData,
  };
}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}
