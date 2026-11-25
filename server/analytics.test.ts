import assert from "node:assert/strict";
import test from "node:test";
import { filterReviews, summarizeReviews } from "./analytics";
import { demoProperties, demoReviews } from "./data";
import { parseReviewCsv, stringifyReviews } from "./review-import";

test("review filters combine property, sentiment, and search", () => {
  const matches = filterReviews(demoReviews, {
    propertyId: "potts-point",
    sentiment: "negative",
    search: "sound",
  });
  assert.deepEqual(matches.map((review) => review.id), ["r-004"]);
});

test("demo records use only the four official Azzurro property identities", () => {
  assert.deepEqual(
    demoProperties.map((property) => property.name),
    [
      "Azzurro Pod Hotel – Potts Point",
      "Azzurro Pod Hotel – Central Sydney",
      "Azzurro Pod Hotel – Darling Harbour",
      "Olympic Hotel Paddington",
    ],
  );
  assert.equal(demoReviews.every((review) => demoProperties.some((property) => property.id === review.propertyId)), true);
  assert.equal(demoReviews.every((review) => review.isDemo), true);
  assert.equal(demoProperties.every((property) => property.image.includes("azzurro")), true);
  assert.equal(demoProperties.every((property) => property.officialUrl.startsWith("https://www.azzurrohotels.com/properties/")), true);
  assert.equal(demoProperties.every((property) => demoReviews.filter((review) => review.propertyId === property.id).length === 4), true);
});

test("summary metrics are calculated from stored reviews and category values", () => {
  const records = [
    { ...demoReviews[0], date: "2026-03-11", score: 9, isDemo: false, analysisProvider: "test-model", categoryRatings: { cleanliness: 8, staff: 10 } },
    { ...demoReviews[1], date: "2026-04-15", score: 5, isDemo: false, sentiment: "unanalysed" as const, analysisStatus: "unanalysed" as const, categoryRatings: { cleanliness: 6 } },
  ];
  const summary = summarizeReviews(records, demoProperties);
  assert.equal(summary.total, 2);
  assert.equal(summary.average, 7);
  assert.equal(summary.analyzed, 1);
  assert.equal(summary.positive + summary.negative + summary.mixed, 100);
  const property = summary.propertyStats.find((item) => item.id === records[0].propertyId);
  assert.equal(property?.reviewCount, 2);
  assert.equal(property?.rating, 7);
  assert.equal(property?.categories.cleanliness, 7);
  assert.equal(property?.categories.staff, 10);
  assert.equal(summary.trend.length, 2);
});

test("unanalysed reviews do not receive fabricated sentiment percentages", () => {
  const records = demoReviews.map((review) => ({
    ...review,
    isDemo: false,
    analysisStatus: "unanalysed" as const,
    sentiment: "unanalysed" as const,
  }));
  const summary = summarizeReviews(records, demoProperties);
  assert.equal(summary.total, 16);
  assert.equal(summary.analyzed, 0);
  assert.equal(summary.positive + summary.negative + summary.mixed, 0);
});

test("demo classifications are excluded from mixed real-data sentiment totals", () => {
  const imported = {
    ...demoReviews[0],
    id: "imported-unanalysed",
    isDemo: false,
    source: "import" as const,
    sentiment: "unanalysed" as const,
    analysisStatus: "unanalysed" as const,
    analysisProvider: undefined,
  };
  const summary = summarizeReviews([...demoReviews, imported], demoProperties);
  assert.equal(summary.total, 17);
  assert.equal(summary.analyzed, 0);
  assert.equal(summary.positive + summary.negative + summary.mixed, 0);
});

test("CSV import validates official property IDs and leaves records unanalysed", () => {
  const csv = [
    "propertyId,date,score,guestName,title,positive,negative,category_staff,sourceRef",
    'potts-point,2026-03-10,8.5,Guest One,"A, very nice stay","Helpful, friendly staff",,9,booking-123',
  ].join("\r\n");
  const [review] = parseReviewCsv(csv, demoProperties);
  assert.equal(review.propertyId, "potts-point");
  assert.equal(review.sentiment, "unanalysed");
  assert.equal(review.analysisStatus, "unanalysed");
  assert.equal(review.isDemo, false);
  assert.equal(review.categoryRatings?.staff, 9);
  assert.equal(review.positive, "Helpful, friendly staff");
  assert.throws(() => parseReviewCsv(csv.replace("potts-point", "unknown"), demoProperties), /not one of the configured/);
  assert.throws(() => parseReviewCsv(csv.replace("2026-03-10", "2026-02-30"), demoProperties), /valid calendar date/);
});

test("CSV export escapes review text and preserves every exported field", () => {
  const review = {
    ...demoReviews[0],
    title: 'Excellent, "thoughtful" stay',
    positive: "Lovely staff\r\nand comfortable bed",
    sourceRef: "sample-1",
    categoryRatings: { cleanliness: 9 },
  };
  const csv = stringifyReviews([review]);
  assert.match(csv, /"Excellent, ""thoughtful"" stay"/);
  assert.match(csv, /"Lovely staff\r\nand comfortable bed"/);
  assert.match(csv, /category_cleanliness/);
  const [roundTripped] = parseReviewCsv(csv, demoProperties);
  assert.equal(roundTripped.title, review.title);
  assert.equal(roundTripped.positive, review.positive);
  assert.equal(roundTripped.sourceRef, review.sourceRef);
  assert.equal(roundTripped.categoryRatings?.cleanliness, 9);
});

test("CSV import rejects duplicate source references within a property", () => {
  const row = "potts-point,2026-03-10,8,Guest,Title,Positive,,booking-123";
  const csv = `propertyId,date,score,guestName,title,positive,negative,sourceRef\r\n${row}\r\n${row}`;
  assert.throws(() => parseReviewCsv(csv, demoProperties), /duplicate sourceRef/);
});

test("empty review summaries have zero metrics", () => {
  const summary = summarizeReviews([], demoProperties);
  assert.equal(summary.total, 0);
  assert.equal(summary.average, 0);
  assert.equal(summary.positive + summary.negative + summary.mixed, 0);
});
