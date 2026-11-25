import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import type { CategoryRatings, GuestReview, HotelProperty, Sentiment } from "../lib/types";

const textLimit = 12_000;
const categories = ["cleanliness", "comfort", "staff", "facilities", "location", "value"] as const;
const optionalText = (value: unknown, fallback: string, maximum = textLimit) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > maximum) throw new Error(`Text fields must be no longer than ${maximum} characters.`);
  return text || fallback;
};

function parseScore(value: unknown, label: string) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error(`${label} must be a number from 0 to 10.`);
  }
  return score;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("date must use YYYY-MM-DD.");
  }
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("date must be a valid calendar date.");
  }
  return value;
}

function readCategoryRatings(row: Record<string, unknown>): Partial<CategoryRatings> | undefined {
  const result: Partial<CategoryRatings> = {};
  for (const category of categories) {
    const raw = row[`category_${category}`];
    if (raw === undefined || raw === "") continue;
    result[category] = parseScore(raw, `category_${category}`);
  }
  return Object.keys(result).length ? result : undefined;
}

function createReview(
  row: Record<string, unknown>,
  properties: HotelProperty[],
  rowNumber: number,
): GuestReview {
  const propertyId = optionalText(row.propertyId, "", 100);
  if (!properties.some((property) => property.id === propertyId)) {
    throw new Error(`propertyId "${propertyId}" is not one of the configured Azzurro properties.`);
  }
  const replyStatus = row.replyStatus === "Replied" ? "Replied" : "Needs reply";
  return {
    id: randomUUID(),
    propertyId,
    guestName: optionalText(row.guestName, `Imported guest ${rowNumber}`, 120),
    country: optionalText(row.country, "Not provided", 100),
    date: parseDate(row.date),
    stay: optionalText(row.stay, "Stay details not provided", 120),
    score: parseScore(row.score, "score"),
    sentiment: "unanalysed" as Sentiment,
    title: optionalText(row.title, "Guest review", 300),
    positive: optionalText(row.positive, ""),
    negative: optionalText(row.negative, ""),
    replyStatus,
    isDemo: false,
    source: "import",
    ...(row.sourceRef ? { sourceRef: optionalText(row.sourceRef, "", 200) } : {}),
    ...(readCategoryRatings(row) ? { categoryRatings: readCategoryRatings(row) } : {}),
    analysisStatus: "unanalysed",
    topics: [],
  };
}

export function parseReviewCsv(csv: string, properties: HotelProperty[]): GuestReview[] {
  if (!csv.trim()) throw new Error("The uploaded CSV is empty.");
  let rows: Record<string, unknown>[];
  try {
    rows = parse(csv, {
      bom: true,
      columns: (headers: string[]) => headers.map((header) => header.trim()),
      skip_empty_lines: true,
      trim: true,
      max_record_size: textLimit,
      relax_column_count: false,
    }) as Record<string, unknown>[];
  } catch (error) {
    const detail = error instanceof Error ? error.message : "CSV parsing failed.";
    throw new Error(`Could not parse CSV: ${detail}`);
  }
  if (rows.length === 0) throw new Error("The uploaded CSV must include a header and at least one review.");
  if (rows.length > 5000) throw new Error("CSV imports are limited to 5,000 reviews at a time.");
  const required = ["propertyId", "date", "score"];
  const missing = required.filter((column) => !(column in rows[0]));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
  const errors: string[] = [];
  const reviews: GuestReview[] = [];
  rows.forEach((row, index) => {
    try {
      reviews.push(createReview(row, properties, index + 2));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Invalid review row.";
      errors.push(`Row ${index + 2}: ${detail}`);
    }
  });
  if (errors.length) throw new Error(`Import validation failed; no rows were saved. ${errors.slice(0, 15).join(" ")}`);
  const refs = reviews.flatMap((review) => (review.sourceRef ? [`${review.propertyId}:${review.sourceRef}`] : []));
  if (new Set(refs).size !== refs.length) {
    throw new Error("The CSV contains duplicate sourceRef values for the same property.");
  }
  return reviews;
}

function csvEscape(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function stringifyReviews(reviews: GuestReview[]): string {
  const headers = [
    "id",
    "propertyId",
    "sourceRef",
    "date",
    "score",
    "guestName",
    "country",
    "stay",
    "title",
    "positive",
    "negative",
    "sentiment",
    "topics",
    "replyStatus",
    "isDemo",
    ...categories.map((category) => `category_${category}`),
  ];
  return [
    headers.join(","),
    ...reviews.map((review) =>
      [
        review.id,
        review.propertyId,
        review.sourceRef,
        review.date,
        review.score,
        review.guestName,
        review.country,
        review.stay,
        review.title,
        review.positive,
        review.negative,
        review.sentiment,
        review.topics.join("|"),
        review.replyStatus,
        review.isDemo,
        ...categories.map((category) => review.categoryRatings?.[category]),
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\r\n");
}
