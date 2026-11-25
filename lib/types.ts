export type Sentiment = "positive" | "mixed" | "negative" | "unanalysed";

export type CategoryRatings = {
  cleanliness: number;
  comfort: number;
  staff: number;
  facilities: number;
  location: number;
  value: number;
};

export type HotelProperty = {
  id: string;
  name: string;
  location: string;
  region: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string;
  accent: string;
  tagline: string;
  description: string;
  accommodationStyle: string;
  officialUrl: string;
  categories: Partial<CategoryRatings>;
};

export type GuestReview = {
  id: string;
  propertyId: string;
  guestName: string;
  country: string;
  date: string;
  stay: string;
  score: number;
  sentiment: Sentiment;
  title: string;
  positive: string;
  negative: string;
  replyStatus: "Replied" | "Needs reply";
  isDemo: boolean;
  source: "demo" | "import" | "manual";
  sourceRef?: string;
  categoryRatings?: Partial<CategoryRatings>;
  analysisStatus: "unanalysed" | "complete";
  analysisProvider?: string;
  topics: string[];
  analyzedAt?: string;
};

export type DashboardData = {
  demoData: boolean;
  containsDemoData: boolean;
  properties: HotelProperty[];
  reviews: GuestReview[];
  trend: { month: string; score: number; reviews: number }[];
  integrations: {
    storage: "mongodb" | "demo-memory";
    aiConfigured: boolean;
    databaseMessage?: string | null;
  };
};

export type ReviewInsights = {
  demoData: boolean;
  provider: string;
  reviewCount: number;
  summary: string;
  strengths: string[];
  friction: string[];
  suggestions: string[];
  themes: { name: string; mentions: number; sentiment: Sentiment }[];
};

export type OperationsAnswer = {
  answer: string;
  evidence: { reviewId: string; propertyName: string; date: string; quote: string }[];
  reviewCount: number;
  provider: string;
  demoData: boolean;
};
