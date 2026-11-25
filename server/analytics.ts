import type { CategoryRatings, GuestReview, HotelProperty } from "../lib/types";

export function filterReviews(
  reviews: GuestReview[],
  options: { propertyId?: string; sentiment?: string; search?: string; properties?: HotelProperty[] },
): GuestReview[] {
  const query = options.search?.trim().toLowerCase();
  return reviews.filter((review) => {
    if (options.propertyId && review.propertyId !== options.propertyId) return false;
    if (options.sentiment && options.sentiment !== "all" && review.sentiment !== options.sentiment) return false;
    if (query) {
      const property = options.properties?.find((item) => item.id === review.propertyId);
      const haystack = [
        review.guestName,
        review.country,
        review.title,
        review.positive,
        review.negative,
        ...review.topics,
        property?.name ?? "",
        property?.location ?? "",
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function summarizeReviews(reviews: GuestReview[], properties: HotelProperty[]) {
  const total = reviews.length;
  const demoOnly = reviews.length > 0 && reviews.every((review) => review.isDemo);
  const analyzed = reviews.filter(
    (review) =>
      review.analysisStatus === "complete" &&
      (demoOnly || (!review.isDemo && review.analysisProvider !== "Synthetic demo labels")),
  );
  const positive = analyzed.filter((review) => review.sentiment === "positive").length;
  const negative = analyzed.filter((review) => review.sentiment === "negative").length;
  const mixed = analyzed.filter((review) => review.sentiment === "mixed").length;
  const average = total
    ? Number((reviews.reduce((sum, review) => sum + review.score, 0) / total).toFixed(1))
    : 0;
  const sentimentTotal = analyzed.length;
  const sentimentCounts = { positive, negative, mixed };
  const sentimentShares = Object.entries(sentimentCounts).map(([name, count], index) => {
    const raw = sentimentTotal ? (count / sentimentTotal) * 100 : 0;
    return { name, index, value: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });
  let remaining = sentimentTotal ? 100 - sentimentShares.reduce((sum, item) => sum + item.value, 0) : 0;
  for (const item of [...sentimentShares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining <= 0) break;
    item.value += 1;
    remaining -= 1;
  }
  const sentimentPercent = (name: keyof typeof sentimentCounts) =>
    sentimentShares.find((item) => item.name === name)?.value ?? 0;
  const propertyStats = properties.map((property) => {
    const subset = reviews.filter((review) => review.propertyId === property.id);
    const rating = subset.length
      ? Number((subset.reduce((sum, review) => sum + review.score, 0) / subset.length).toFixed(1))
      : 0;
    const categoryEntries = ["cleanliness", "comfort", "staff", "facilities", "location", "value"] as const;
    const categories = Object.fromEntries(
      categoryEntries.flatMap((category) => {
        const values = subset.flatMap((review) => {
          const value = review.categoryRatings?.[category];
          return typeof value === "number" ? [value] : [];
        });
        return values.length
          ? [[category, Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))]]
          : [];
      }),
    ) as Partial<CategoryRatings>;
    return { ...property, reviewCount: subset.length, rating, categories };
  });
  const monthly = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    const key = review.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const month = monthly.get(key) ?? { total: 0, count: 0 };
    month.total += review.score;
    month.count += 1;
    monthly.set(key, month);
  }
  const trend = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, stats]) => ({
      month: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(new Date(`${key}-15T12:00:00`)),
      score: Number((stats.total / stats.count).toFixed(1)),
      reviews: stats.count,
    }));
  return {
    total,
    average,
    analyzed: sentimentTotal,
    positive: sentimentPercent("positive"),
    negative: sentimentPercent("negative"),
    mixed: sentimentPercent("mixed"),
    propertyStats,
    trend,
  };
}
