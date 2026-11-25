"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Globe2,
  Hotel,
  ImageUp,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  Menu,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardData, GuestReview, HotelProperty, OperationsAnswer, ReviewInsights, Sentiment } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const sentimentColors = { positive: "#7fa89d", mixed: "#d7b889", negative: "#d38d7d" };
const navLinks = [
  { label: "Overview", icon: LayoutDashboard, id: "overview" },
  { label: "Properties", icon: Hotel, id: "properties" },
  { label: "Guest reviews", icon: MessageCircle, id: "reviews" },
  { label: "AI insights", icon: Sparkles, id: "insights" },
];

type Summary = {
  total: number;
  average: number;
  analyzed: number;
  positive: number;
  negative: number;
  mixed: number;
  needsReply: number;
};
type DashboardResponse = DashboardData & { summary: Summary };
type ReviewPageResponse = { reviews: GuestReview[]; total: number; page: number; limit: number };
type Period = "all" | "30" | "90";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function Rating({ score, large = false }: { score: number; large?: boolean }) {
  return (
    <span className={`rating ${large ? "rating-large" : ""}`}>
      <span>{score.toFixed(1)}</span>
      <Star size={large ? 15 : 12} fill="currentColor" strokeWidth={0} />
    </span>
  );
}

function SentimentTag({ sentiment }: { sentiment: Sentiment }) {
  const label =
    sentiment === "positive"
      ? "Positive"
      : sentiment === "mixed"
        ? "Mixed"
        : sentiment === "negative"
          ? "Needs attention"
          : "Unanalysed";
  return <span className={`sentiment-tag sentiment-${sentiment}`}>{label}</span>;
}

function PropertyCard({
  property,
  index,
  demoData,
  onSelect,
}: {
  property: HotelProperty;
  index: number;
  demoData: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      className="property-card"
      onClick={onSelect}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      whileHover={{ y: -5 }}
      aria-label={`Open ${property.name} property dashboard`}
    >
      <span className="property-image" style={{ backgroundImage: `url("${property.image}")` }} />
      <span className="property-image-shade" />
      <span className="property-card-top">
        <span className="property-region">{property.region}</span>
        <span className="property-open"><ArrowUpRight size={16} /></span>
      </span>
      <span className="property-card-copy">
        <span className="property-card-title">{property.name}</span>
        <span className="property-location"><MapPin size={12} /> {property.location}</span>
      </span>
      <span className="property-card-bottom">
        <span className="property-score">{property.rating > 0 ? <Rating score={property.rating} /> : <span className="no-rating">—</span>} <span>{demoData ? "demo average" : "review average"}</span></span>
        <span className="property-review-count"><MessageCircle size={13} /> {property.reviewCount} {demoData ? "sample reviews" : "reviews"}</span>
      </span>
    </motion.button>
  );
}

function ReviewRow({
  review,
  property,
  canManage,
  onEdit,
  onReply,
  onDelete,
}: {
  review: GuestReview;
  property?: HotelProperty;
  canManage: boolean;
  onEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="review-row">
      <div className="review-guest">
        <span className="guest-avatar">{review.guestName.slice(0, 1)}</span>
        <span className="guest-meta">
          <strong>{review.guestName}</strong>
          <small><Globe2 size={11} /> {review.country}</small>
        </span>
      </div>
      <div className="review-copy">
        <div className="review-title-line">
          <strong>{review.title}</strong>
          <Rating score={review.score} />
        </div>
        <p>
          {review.positive && <span className="review-positive-quote">+ {review.positive}</span>}
          {review.negative && <span className="review-negative-quote">{review.positive ? " · " : ""}− {review.negative}</span>}
        </p>
        <small className="review-property-name">{property?.name} · {review.stay} · {review.isDemo ? "synthetic demo" : `${review.source} record`}{review.topics.length > 0 && review.analysisStatus === "complete" && !review.isDemo ? ` · Topics: ${review.topics.join(", ")}` : ""}</small>
      </div>
      <div className="review-date">
        <span>{formatDate(review.date)}</span>
        <span className={`reply-status ${review.replyStatus === "Replied" ? "is-replied" : "is-pending"}`}>
          {review.replyStatus === "Replied" ? <Check size={11} /> : <Clock3 size={11} />}
          {review.replyStatus}
        </span>
      </div>
      <SentimentTag sentiment={review.sentiment} />
      <div className="review-actions">
        <button disabled={!canManage} onClick={onEdit} title={canManage ? "Edit review" : "Connect MongoDB to manage reviews"} aria-label="Edit review"><Pencil size={13} /></button>
        <button disabled={!canManage} onClick={onReply} title={canManage ? "Toggle reply status" : "Connect MongoDB to manage reviews"} aria-label={review.replyStatus === "Replied" ? "Mark as needing reply" : "Mark as replied"}>
          {review.replyStatus === "Replied" ? <Check size={13} /> : <Send size={13} />}
        </button>
        <button disabled={!canManage} onClick={onDelete} title="Delete review" aria-label="Delete review"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [assistantAnswer, setAssistantAnswer] = useState<OperationsAnswer | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [section, setSection] = useState("overview");
  const [period, setPeriod] = useState<Period>("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [replyFilter, setReplyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [showNewReview, setShowNewReview] = useState(false);
  const [editingReview, setEditingReview] = useState<GuestReview | null>(null);
  const [error, setError] = useState("");
  const [insightError, setInsightError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const csvInput = useRef<HTMLInputElement>(null);

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      setData(await requestJson<DashboardResponse>("/dashboard"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async (propertyId: string | null) => {
    setInsightLoading(true);
    setInsightError("");
    setInsights(null);
    try {
      setInsights(await requestJson<ReviewInsights>("/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      }));
    } catch (loadError) {
      setInsightError(loadError instanceof Error ? loadError.message : "Could not load insights.");
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({ page: "1", limit: "100" });
    if (selectedPropertyId) parameters.set("propertyId", selectedPropertyId);
    if (sentimentFilter !== "all") parameters.set("sentiment", sentimentFilter);
    if (replyFilter !== "all") parameters.set("replyStatus", replyFilter);
    if (search.trim()) parameters.set("search", search.trim());
    if (period !== "all") {
      const today = new Date();
      parameters.set("from", new Date(today.getTime() - Number(period) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      parameters.set("to", today.toISOString().slice(0, 10));
    }
    const timeout = window.setTimeout(() => {
      setReviewLoading(true);
      requestJson<ReviewPageResponse>(`/reviews?${parameters.toString()}`, { signal: controller.signal })
        .then((result) => {
          setReviews(result.reviews);
          setReviewTotal(result.total);
        })
        .catch((loadError: unknown) => {
          if (controller.signal.aborted) return;
          setActionError(loadError instanceof Error ? loadError.message : "Could not load reviews.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setReviewLoading(false);
        });
    }, search.trim() ? 250 : 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [data, period, replyFilter, search, selectedPropertyId, sentimentFilter]);

  const properties = data?.properties ?? [];
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) ?? null;
  const filteredReviews = reviews;

  const sentimentData = [
    { name: "Positive", value: data?.summary.positive ?? 0, color: sentimentColors.positive },
    { name: "Mixed", value: data?.summary.mixed ?? 0, color: sentimentColors.mixed },
    { name: "Negative", value: data?.summary.negative ?? 0, color: sentimentColors.negative },
  ];
  const propertyStats = properties.map((property) => ({
    id: property.id,
    name: property.name.replace(" ", "\n"),
    rating: property.rating,
    fill: property.id === selectedPropertyId ? "#365c56" : "#94b5ac",
  }));
  const canManage = data?.integrations.storage === "mongodb";
  const canUseAi = data?.integrations.storage === "mongodb" && data.integrations.aiConfigured;

  const navigate = (id: string) => {
    setSection(id);
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSentimentFilter("all");
    setReplyFilter("all");
    setSection("properties");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadMoreReviews = async () => {
    if (!data || reviewLoading || reviews.length >= reviewTotal) return;
    setReviewLoading(true);
    setActionError("");
    try {
      const page = Math.floor(reviews.length / 100) + 1;
      const parameters = new URLSearchParams({ page: String(page), limit: "100" });
      if (selectedPropertyId) parameters.set("propertyId", selectedPropertyId);
      if (sentimentFilter !== "all") parameters.set("sentiment", sentimentFilter);
      if (replyFilter !== "all") parameters.set("replyStatus", replyFilter);
      if (search.trim()) parameters.set("search", search.trim());
      if (period !== "all") {
        const today = new Date();
        parameters.set("from", new Date(today.getTime() - Number(period) * 86_400_000).toISOString().slice(0, 10));
        parameters.set("to", today.toISOString().slice(0, 10));
      }
      const result = await requestJson<ReviewPageResponse>(`/reviews?${parameters.toString()}`);
      setReviews((current) => [...current, ...result.reviews]);
      setReviewTotal(result.total);
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : "Could not load more reviews.");
    } finally {
      setReviewLoading(false);
    }
  };

  const manageReview = async (review: GuestReview, action: "reply" | "delete") => {
    if (!canManage) return;
    if (action === "delete" && !window.confirm(`Delete the review “${review.title}”? This cannot be undone.`)) return;
    setActionError("");
    setActionMessage("");
    try {
      if (action === "reply") {
        await requestJson(`/reviews/${encodeURIComponent(review.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replyStatus: review.replyStatus === "Replied" ? "Needs reply" : "Replied" }),
        });
        setActionMessage("Reply status updated.");
      } else {
        const response = await fetch(`${API_URL}/reviews/${encodeURIComponent(review.id)}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || `Delete failed (${response.status}).`);
        }
        setActionMessage("Review deleted.");
      }
      await loadDashboard();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Could not update this review.");
    }
  };

  const importCsv = async (file?: File) => {
    if (!file) return;
    if (!canManage) {
      setActionError("CSV import requires MongoDB. Configure MONGODB_URI and restart the API.");
      return;
    }
    setImportLoading(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(`${API_URL}/reviews/import`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: await file.text(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `Import failed (${response.status}).`);
      setActionMessage(`${body.imported} reviews imported. Run AI analysis to extract sentiment and topics.`);
      await loadDashboard();
    } catch (importError) {
      setActionError(importError instanceof Error ? importError.message : "Could not import this CSV.");
    } finally {
      setImportLoading(false);
      if (csvInput.current) csvInput.current.value = "";
    }
  };

  const exportCsv = async () => {
    setActionError("");
    try {
      const parameters = new URLSearchParams();
      if (selectedPropertyId) parameters.set("propertyId", selectedPropertyId);
      if (sentimentFilter !== "all") parameters.set("sentiment", sentimentFilter);
      if (replyFilter !== "all") parameters.set("replyStatus", replyFilter);
      if (search.trim()) parameters.set("search", search.trim());
      if (period !== "all") {
        const today = new Date();
        parameters.set("from", new Date(today.getTime() - Number(period) * 86_400_000).toISOString().slice(0, 10));
        parameters.set("to", today.toISOString().slice(0, 10));
      }
      const response = await fetch(`${API_URL}/reviews/export?${parameters.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "azzurro-reviews.csv";
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (exportError) {
      setActionError(exportError instanceof Error ? exportError.message : "Could not export reviews.");
    }
  };

  const createReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue | number> = Object.fromEntries(formData.entries());
    payload.score = Number(payload.score);
    setReviewSaving(true);
    setActionError("");
    try {
      const reviewToUpdate = editingReview;
      const body = reviewToUpdate
        ? { score: payload.score, title: payload.title, positive: payload.positive, negative: payload.negative }
        : payload;
      await requestJson(reviewToUpdate ? `/reviews/${encodeURIComponent(reviewToUpdate.id)}` : "/reviews", {
        method: reviewToUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setShowNewReview(false);
      setEditingReview(null);
      setActionMessage(reviewToUpdate ? "Review updated. Its AI analysis was cleared and can be run again." : "Review saved. Run AI analysis to classify it.");
      await loadDashboard();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Could not create the review.");
    } finally {
      setReviewSaving(false);
    }
  };

  const askAssistant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUseAi || !assistantQuestion.trim()) return;
    setAssistantLoading(true);
    setAssistantError("");
    setAssistantAnswer(null);
    try {
      setAssistantAnswer(await requestJson<OperationsAnswer>("/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: assistantQuestion.trim(), propertyId: selectedPropertyId }),
      }));
    } catch (assistantError) {
      setAssistantError(assistantError instanceof Error ? assistantError.message : "The assistant could not answer.");
    } finally {
      setAssistantLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <main className="loading-screen">
        <span className="loading-mark"><Hotel size={19} /></span>
        <span className="loading-wordmark">AZZURRO</span>
        <span className="loading-line" />
        <p>Gathering guest perspectives</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="error-screen">
        <div className="error-panel">
          <span className="eyebrow">AZZURRO · GUEST INTELLIGENCE</span>
          <h1>The dashboard is taking a moment.</h1>
          <p>{error || "The insights API could not be reached. Start the project with npm run dev."}</p>
          <button className="button button-dark" onClick={() => void loadDashboard()}>Try again <ArrowRight size={14} /></button>
          <small>API endpoint · {API_URL}</small>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand-lockup" href="#overview" onClick={() => setSelectedPropertyId(null)}>
            <span className="brand-symbol">a.</span>
            <span className="brand-type"><strong>AZZURRO</strong><small>HOTELS · INTELLIGENCE</small></span>
          </a>
          <button className="sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Dashboard navigation">
          {navLinks.map(({ label, icon: Icon, id }) => (
            <button
              key={id}
              className={`side-nav-link ${section === id ? "is-active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
              {id === "reviews" && data.summary.needsReply > 0 && <span className="nav-count">{data.summary.needsReply}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-rule" />
        <div className="workspace-label property-nav-label">YOUR PROPERTIES <span>04</span></div>
        <div className="mini-property-list">
          {properties.map((property, index) => (
            <button
              key={property.id}
              className={`mini-property ${selectedPropertyId === property.id ? "is-selected" : ""}`}
              onClick={() => openProperty(property.id)}
            >
              <span className="mini-property-dot" style={{ backgroundColor: property.accent }} />
              <span className="mini-property-info"><strong>{property.name}</strong><small>{property.location}</small></span>
              <span className="mini-property-rating">{property.reviewCount ? `${property.rating.toFixed(1)}${data.demoData ? " demo" : ""}` : "No reviews"}</span>
              <span className="sr-only">Property {index + 1}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="data-note"><span className={`data-pulse ${canManage ? "is-connected" : ""}`} /><span><strong>{canManage ? "MongoDB connected" : data.integrations.databaseMessage ? "MongoDB unavailable" : "Demo workspace"}</strong><small>{canManage ? "Review management enabled" : "Read-only synthetic data"}</small></span></div>
          <button className="help-link"><CircleHelp size={15} /> About this dashboard <ArrowUpRight size={13} /></button>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumbs"><span>Portfolio</span><ChevronRight size={13} /><strong>{selectedProperty ? selectedProperty.name : "Overview"}</strong></div>
          <div className="topbar-right">
            <span className="data-chip"><span /> {data.demoData ? "SYNTHETIC DEMO" : data.containsDemoData ? "MIXED DATA" : "STORED REVIEWS"}</span>
            <button className="topbar-avatar" aria-label="Azzurro management workspace">A</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="intro-hero">
            <div className="hero-photo" />
            <div className="hero-wash" />
            <div className="hero-grain" />
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-content">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
                <div className="hero-kicker"><span className="kicker-line" /> A MORE HUMAN WAY TO LISTEN</div>
                <h1>Every stay tells<br />you <em>something.</em></h1>
                <p>One considered view of the conversations shaping<br className="desktop-break" /> the Azzurro guest experience.</p>
                <button className="hero-scroll" onClick={() => navigate("properties")}>Explore the portfolio <ArrowDownRight size={15} /></button>
              </motion.div>
            </div>
            <div className="hero-image-caption"><span>01 — 04</span><span>THE AZZURRO COLLECTION</span><span>SYDNEY, MADE PERSONAL</span></div>
            <div className="hero-orb"><span>AZ</span><span>GUEST<br />INTELLIGENCE</span></div>
          </section>

          <div className="demo-banner">
            <span className="demo-banner-icon"><Activity size={14} /></span>
            <span><strong>{data.demoData ? "Demonstration workspace" : "Connected review workspace"}</strong> — official property details and photographs are from Azzurro&apos;s website. {data.demoData ? "Ratings, counts, trends, and guest comments shown are synthetic examples, not Booking.com data." : `Review metrics reflect stored records${data.containsDemoData ? ", including synthetic demo examples" : ""}; no Booking.com source integration is configured.`}</span>
            <span className="demo-banner-mark">{data.demoData ? "DEMO ONLY" : data.containsDemoData ? "MIXED DATA" : "REVIEW DATA"}</span>
          </div>
          {data.integrations.databaseMessage && <div className="integration-notice database-notice" role="status"><CircleHelp size={15} /><span><strong>Database-backed features are disabled.</strong> {data.integrations.databaseMessage}</span></div>}

          <section className="section-block overview-section">
            <div className="section-heading">
              <div><div className="eyebrow">PORTFOLIO PULSE <span className="eyebrow-dot" /></div><h2>A little perspective.</h2><p>Guest feedback, gathered across your collection.</p></div>
              <div className="period-picker">
                <CalendarDays size={14} />
                <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Review date range">
                  <option value="all">All review dates</option>
                  <option value="90">Last 90 days</option>
                  <option value="30">Last 30 days</option>
                </select>
                <ChevronDown size={13} />
              </div>
            </div>

            <div className="metric-grid">
              <motion.article className="metric-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
                  <div className="metric-label">{data.demoData ? "SYNTHETIC REVIEWS" : "STORED REVIEWS"} <MessageCircle size={14} /></div>
                  <div className="metric-value">{data.summary.total}</div>
                  <div className="metric-foot"><span className="metric-neutral">{data.demoData ? "Illustrative dataset" : data.containsDemoData ? "Includes demo records" : "From connected database"}</span><span>{properties.length} properties</span></div>
              </motion.article>
              <motion.article className="metric-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="metric-label">{data.demoData ? "DEMO GUEST SCORE" : "AVERAGE REVIEW SCORE"} <Star size={14} /></div>
                  <div className="metric-value">{data.summary.total ? data.summary.average.toFixed(1) : "—"}<span className="metric-unit"> / 10</span></div>
                  <div className="metric-foot"><span className="metric-positive"><TrendingUp size={12} /> {data.demoData ? "Synthetic average" : "Stored review average"}</span><span>{data.demoData ? "Not a live rating" : data.containsDemoData ? "Includes demo records" : "From stored reviews"}</span></div>
              </motion.article>
              <motion.article className="metric-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                <div className="metric-label">POSITIVE SENTIMENT <ThumbsUp size={14} /></div>
                <div className="metric-value">{data.summary.analyzed ? data.summary.positive : "—"}{data.summary.analyzed > 0 && <span className="metric-unit">%</span>}</div>
                <div className="sentiment-track"><span style={{ width: `${data.summary.positive}%` }} /><i style={{ width: `${100 - data.summary.positive}%` }} /></div>
                <div className="metric-foot"><span>of {data.summary.analyzed} analysed reviews</span><span>{data.demoData ? "Synthetic labels" : data.containsDemoData ? "Includes demo labels" : "AI labels"}</span></div>
              </motion.article>
              <motion.article className="metric-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <div className="metric-label">NEEDS A RESPONSE <Send size={14} /></div>
                <div className="metric-value">{data.summary.needsReply}<span className="metric-unit"> / {data.summary.total}</span></div>
                <div className="metric-foot"><span className="metric-attention">{data.summary.needsReply ? "A few guests are waiting" : "All caught up"}</span><button onClick={() => { setSentimentFilter("all"); setReplyFilter("Needs reply"); navigate("reviews"); }}>View reviews <ArrowRight size={12} /></button></div>
              </motion.article>
            </div>
          </section>

          <section className="section-block properties-section" id="properties">
            <div className="section-heading section-heading-compact">
              <div><div className="eyebrow">THE COLLECTION <span className="eyebrow-count">04 PROPERTIES</span></div><h2>{selectedProperty ? selectedProperty.name : "A place for every point of view."}</h2><p>{selectedProperty ? `${selectedProperty.region} · ${selectedProperty.tagline}` : "Four distinct stays. One shared standard of care."}</p></div>
              {selectedProperty ? (
                <button className="text-button" onClick={() => setSelectedPropertyId(null)}><ArrowLeft size={14} /> All properties</button>
              ) : <button className="text-button" onClick={() => navigate("reviews")}>Explore guest feedback <ArrowRight size={14} /></button>}
            </div>

            {selectedProperty ? (
              <motion.div key={selectedProperty.id} className="property-detail" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="detail-cover" style={{ backgroundImage: `url("${selectedProperty.image}")` }}>
                  <div className="detail-cover-shade" />
                  <div className="detail-cover-label"><span>{selectedProperty.region}</span><h3>{selectedProperty.name}</h3><p>{selectedProperty.tagline}</p></div>
                  <div className="detail-score"><span>{data.demoData ? "DEMO SAMPLE SCORE" : "AVERAGE REVIEW SCORE"}</span>{selectedProperty.reviewCount ? <Rating score={selectedProperty.rating} large /> : <strong className="no-rating">—</strong>}<small>{selectedProperty.reviewCount} {data.demoData ? "synthetic guest reviews" : "stored reviews"}</small></div>
                </div>
                <div className="property-description-panel">
                  <div><span className="eyebrow">ABOUT THIS PROPERTY</span><p>{selectedProperty.description}</p></div>
                  <div><span className="eyebrow">ACCOMMODATION STYLE</span><p>{selectedProperty.accommodationStyle}</p></div>
                  <div className="property-address">
                    <span className="eyebrow">LOCATION</span>
                    <p><MapPin size={13} /> {selectedProperty.address}</p>
                    <a href={selectedProperty.officialUrl} target="_blank" rel="noreferrer">Official property details <ArrowUpRight size={12} /></a>
                  </div>
                </div>
                <div className="category-panel">
                  <div className="category-panel-heading"><div><span className="eyebrow">WHAT GUESTS NOTICE</span><h3>Category ratings</h3></div><span className="category-demo-note">{data.demoData ? "Synthetic demo scores · not Booking.com data" : "Calculated from stored category ratings"}</span></div>
                  {Object.keys(selectedProperty.categories).length > 0 ? <div className="category-grid">
                    {Object.entries(selectedProperty.categories).map(([name, score], index) => (
                      <div className="category-item" key={name}>
                        <div><span>{name}</span><strong>{score?.toFixed(1)}</strong></div>
                        <div className="category-bar"><span style={{ width: `${(score ?? 0) * 10}%`, transitionDelay: `${index * 70}ms` }} /></div>
                      </div>
                    ))}
                  </div> : <p className="empty-note">No category scores are available in stored reviews yet.</p>}
                  <button className="category-review-link" onClick={() => { setSentimentFilter("all"); navigate("reviews"); }}>Read this property&apos;s reviews <ArrowRight size={13} /></button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="property-grid" className="property-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {properties.map((property, index) => (
                  <PropertyCard key={property.id} property={property} index={index} demoData={data.demoData} onSelect={() => openProperty(property.id)} />
                ))}
              </motion.div>
            )}
            {!selectedProperty && <div className="property-grid-foot"><span><span className="data-pulse" /> Four Azzurro properties · scores are calculated from {data.demoData ? "synthetic review examples" : "stored reviews"}</span><span>SELECT A PROPERTY <ArrowUpRight size={12} /></span></div>}
          </section>

          <section className="section-block analytics-section">
            <div className="section-heading section-heading-compact">
              <div><div className="eyebrow">SIGNALS OVER TIME <span className="eyebrow-dot" /></div><h2>Small shifts, worth noticing.</h2><p>{data.demoData ? "Synthetic" : "Stored"} review scores and volume, calculated by month.</p></div>
              <span className="chart-period"><span className="chart-key" /> Calculated score trend <span className="chart-period-divider" /> {data.trend[0]?.month ?? "No data"} — {data.trend.at(-1)?.month ?? "No data"}</span>
            </div>
            <div className="analytics-grid">
              <article className="chart-card trend-card">
                <div className="chart-card-heading"><div><strong>Guest score, month by month</strong><small>Calculated from dated reviews · out of 10</small></div><button className="chart-icon" aria-label="Monthly score trend"><BarChart3 size={15} /></button></div>
                <div className="trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                      <defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#638f84" stopOpacity={0.2} /><stop offset="95%" stopColor="#638f84" stopOpacity={0.01} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="#ecebe6" strokeDasharray="3 5" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#91938c", fontSize: 11 }} dy={10} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: "#a1a39d", fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8e5de", fontSize: 12 }} formatter={(value) => [`${value}/10`, "Mean score"]} />
                      <Area type="monotone" dataKey="score" stroke="#638f84" strokeWidth={2.2} fill="url(#scoreFill)" activeDot={{ r: 5, fill: "#365c56", stroke: "#fff", strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-footnote"><span><span className="data-pulse" /> {data.demoData ? "SYNTHETIC DATA" : "STORED DATA"}</span><span>Monthly values calculated from review records</span></div>
              </article>
              <article className="chart-card sentiment-card">
                <div className="chart-card-heading"><div><strong>Sentiment mix</strong><small>{data.summary.analyzed} analysed reviews · {data.demoData ? "synthetic labels" : "AI labels"}</small></div><button className="chart-icon" aria-label="Review sentiment mix"><Activity size={15} /></button></div>
                <div className="sentiment-chart-wrap">
                  <div className="sentiment-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={76} paddingAngle={3} stroke="none">
                        {sentimentData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie><Tooltip formatter={(value) => [`${value}%`, "of analysed reviews"]} contentStyle={{ borderRadius: 8, border: "1px solid #e8e5de", fontSize: 12 }} /></PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center"><strong>{data.summary.total}</strong><span>reviews</span></div>
                  </div>
                  <div className="sentiment-legend">
                    {sentimentData.map((item) => <div key={item.name}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{data.summary.analyzed ? `${item.value}%` : "—"}</strong></div>)}
                    <small>{data.summary.analyzed} reviews classified</small>
                  </div>
                </div>
                <div className="chart-footnote"><span><span className="data-pulse" /> {data.demoData ? "DEMO LABELS" : "AI-ANALYSED"}</span><span>{data.demoData ? "Not Booking.com sentiment" : "Calculated from stored review analysis"}</span></div>
              </article>
            </div>
            <div className="property-comparison">
              <div className="comparison-title"><span className="eyebrow">A SIDE-BY-SIDE LOOK</span><strong>Property {data.demoData ? "demo" : "review"} scores</strong></div>
              <div className="comparison-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propertyStats} layout="vertical" margin={{ left: 8, right: 25, top: 2, bottom: 2 }} barSize={9}>
                    <XAxis type="number" domain={[0, 10]} hide />
                    <YAxis type="category" dataKey="name" width={112} axisLine={false} tickLine={false} tick={{ fill: "#646a65", fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "#f6f5f1" }} formatter={(value) => [`${value}/10`, data.demoData ? "Demo average" : "Stored average"]} contentStyle={{ borderRadius: 8, border: "1px solid #e8e5de", fontSize: 12 }} />
                    <Bar dataKey="rating" radius={[4, 4, 4, 4]}>{propertyStats.map((item) => <Cell key={item.id} fill={item.fill} onClick={() => openProperty(item.id)} style={{ cursor: "pointer" }} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <span className="comparison-note">Select a bar to open that property. {data.demoData ? "Scores use synthetic reviews." : "Scores use stored reviews."}</span>
            </div>
          </section>

          <section className="section-block insights-section" id="insights">
            <div className="insights-intro">
              <span className="insight-orbit"><Sparkles size={16} /></span>
              <div><div className="eyebrow">REVIEW-GROUNDED ANALYSIS <span className="eyebrow-dot" /></div><h2>Listen for the little things.</h2><p>Run a real analysis on stored reviews to identify strengths, friction, topics, and possible next steps.</p></div>
              <button className="button button-dark insight-refresh" onClick={() => void loadInsights(selectedPropertyId)} disabled={insightLoading || !canUseAi}>
                <Sparkles size={14} /> {insightLoading ? "Analysing stored reviews…" : "Analyse reviews"}
              </button>
            </div>
            {insightError && <div className="inline-error" role="alert">{insightError} <button onClick={() => void loadInsights(selectedPropertyId)}>Try again</button></div>}
            {!canUseAi && <div className="integration-notice"><CircleHelp size={15} /><span><strong>Live AI analysis is unavailable.</strong> {data.integrations.databaseMessage ? `${data.integrations.databaseMessage} ` : ""}{!data.integrations.aiConfigured ? "Configure OPENAI_API_KEY to enable the LLM provider. " : ""}This dashboard will not substitute prewritten or synthetic AI insights.</span></div>}
            {insights && (
              <>
                <div className="ai-source-note"><span className="ai-spark"><Sparkles size={12} /></span><span>{insights.provider} analysis of {insights.reviewCount} stored reviews · {insights.summary}</span><span className="ai-data-pill">LIVE ANALYSIS</span></div>
                <div className="insight-grid">
                  <article className="insight-card strength-card"><div className="insight-card-title"><span className="insight-icon positive-icon"><ThumbsUp size={15} /></span><div><span>WHAT GUESTS VALUE</span><strong>Bright spots</strong></div></div><ul>{insights.strengths.map((item) => <li key={item}>{item}</li>)}</ul></article>
                  <article className="insight-card friction-card"><div className="insight-card-title"><span className="insight-icon friction-icon"><Activity size={15} /></span><div><span>WHERE TO LOOK CLOSER</span><strong>Potential friction</strong></div></div><ul>{insights.friction.map((item) => <li key={item}>{item}</li>)}</ul></article>
                  <article className="insight-card suggestions-card"><div className="insight-card-title"><span className="insight-icon suggestion-icon"><Lightbulb size={15} /></span><div><span>IDEAS TO CONSIDER</span><strong>Gentle next steps</strong></div></div><ul>{insights.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></article>
                </div>
                {insights.themes.length > 0 && <div className="theme-row"><span className="eyebrow">RECURRING TOPICS IN THIS SAMPLE</span>{insights.themes.map((theme) => <span className={`theme-chip theme-${theme.sentiment}`} key={theme.name}><span />{theme.name}<small>{theme.mentions}</small></span>)}</div>}
                <div className="insight-disclaimer"><CircleHelp size={13} /> Analysis is generated from stored review text. Verify the source records and use judgement before acting. {insights.demoData ? "The selected dataset includes synthetic demo records." : ""}</div>
              </>
            )}
            <div className="assistant-card">
              <div className="assistant-heading"><span className="insight-icon suggestion-icon"><MessageCircle size={15} /></span><div><span className="eyebrow">AI OPERATIONS ASSISTANT</span><h3>Ask a question of the guest feedback.</h3><p>Answers are grounded in stored review evidence and include source quotations.</p></div></div>
              <form className="assistant-form" onSubmit={(event) => void askAssistant(event)}>
                <label className="sr-only" htmlFor="assistant-question">Ask about stored guest feedback</label>
                <input id="assistant-question" value={assistantQuestion} onChange={(event) => { setAssistantQuestion(event.target.value); setAssistantError(""); }} placeholder="What are guests mentioning most about staff?" maxLength={1000} disabled={!canUseAi || assistantLoading} />
                <button className="button button-dark" disabled={!canUseAi || assistantLoading || !assistantQuestion.trim()}><Send size={13} />{assistantLoading ? "Asking…" : "Ask"}</button>
              </form>
              {!canUseAi && <small className="assistant-disabled-note">Requires connected MongoDB and a configured LLM provider.</small>}
              {assistantError && <div className="inline-error assistant-error" role="alert">{assistantError}</div>}
              {assistantAnswer && <div className="assistant-answer"><p>{assistantAnswer.answer}</p><small>{assistantAnswer.provider} · based on {assistantAnswer.reviewCount} stored reviews{assistantAnswer.demoData ? " (includes synthetic demo records)" : ""}</small>
                {assistantAnswer.evidence.length > 0 && <ul>{assistantAnswer.evidence.map((item) => <li key={`${item.reviewId}-${item.quote}`}><blockquote>“{item.quote}”</blockquote><span>{item.propertyName} · {formatDate(item.date)} · <a href="#reviews" onClick={() => { setSelectedPropertyId(properties.find((property) => property.name === item.propertyName)?.id ?? null); setSearch(""); navigate("reviews"); }}>View review records</a></span></li>)}</ul>}
              </div>}
            </div>
          </section>

          <section className="section-block reviews-section" id="reviews">
            <div className="section-heading review-heading">
              <div><div className="eyebrow">THE GUEST VOICE <span className="eyebrow-count">{filteredReviews.length} OF {reviewTotal} MATCHING</span></div><h2>Conversations, not just scores.</h2><p>{data.demoData ? "Clearly labelled synthetic examples." : "Reviews stored in the connected database."} {reviewLoading ? "Refreshing…" : ""}</p></div>
              <div className="review-heading-actions">
                <button className="text-button" onClick={() => { setSearch(""); setSentimentFilter("all"); setReplyFilter("all"); setPeriod("all"); setSelectedPropertyId(null); }}>Clear all filters <X size={13} /></button>
                <button className="button button-dark" onClick={() => { setEditingReview(null); setShowNewReview(true); }} disabled={!canManage} title={canManage ? "Add a review record" : "Connect MongoDB to manage reviews"}><Plus size={13} /> Add review</button>
              </div>
            </div>
            <div className="review-toolbar">
              <label className="review-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews, guests, or properties…" aria-label="Search reviews" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>
              <div className="review-filter-group">
                <label className="filter-select"><span>Sentiment</span><select value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value)} aria-label="Filter by sentiment"><option value="all">All feedback</option><option value="positive">Positive</option><option value="mixed">Mixed</option><option value="negative">Needs attention</option><option value="unanalysed">Unanalysed</option></select><ChevronDown size={13} /></label>
                <label className="filter-select"><span>Response</span><select value={replyFilter} onChange={(event) => setReplyFilter(event.target.value)} aria-label="Filter by response status"><option value="all">All status</option><option value="Needs reply">Needs reply</option><option value="Replied">Replied</option></select><ChevronDown size={13} /></label>
                <label className="filter-select property-filter"><span>Property</span><select value={selectedPropertyId ?? "all"} onChange={(event) => setSelectedPropertyId(event.target.value === "all" ? null : event.target.value)} aria-label="Filter by property"><option value="all">All properties</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.name}</option>)}</select><ChevronDown size={13} /></label>
              </div>
            </div>
            <div className="review-management-toolbar">
              <div className="csv-tools">
                <input ref={csvInput} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose review CSV file" onChange={(event) => void importCsv(event.target.files?.[0])} />
                <button className="text-button" onClick={() => csvInput.current?.click()} disabled={!canManage || importLoading} title={canManage ? "Import reviews from CSV" : "Connect MongoDB to import reviews"}><ImageUp size={13} />{importLoading ? "Importing…" : "Import CSV"}</button>
                <button className="text-button" onClick={() => void exportCsv()}><ArrowDownToLine size={13} />Export filtered CSV</button>
              </div>
              <small>CSV import accepts validated records and stores them as unanalysed until AI analysis runs.</small>
            </div>
            {(actionMessage || actionError) && <div className={actionError ? "inline-error review-notice" : "inline-success review-notice"} role={actionError ? "alert" : "status"}>{actionError || actionMessage}<button onClick={() => { setActionError(""); setActionMessage(""); }} aria-label="Dismiss message"><X size={13} /></button></div>}
            {!canManage && <div className="integration-notice compact-notice"><CircleHelp size={14} /><span>{data.integrations.databaseMessage ?? "Review creation, reply-status updates, deletion, and CSV import need a connected MongoDB database."} Demo-memory mode is read-only. CSV export remains available.</span></div>}
            {showNewReview && canManage && <form key={editingReview?.id ?? "new-review"} className="new-review-form" onSubmit={(event) => void createReview(event)}>
              <div className="new-review-heading"><div><strong>{editingReview ? "Edit review" : "Add a review record"}</strong><small>{editingReview ? "Changing text or score clears the previous analysis until it is run again." : "Manually added records are stored as unanalysed until AI processing is run."}</small></div><button type="button" onClick={() => { setShowNewReview(false); setEditingReview(null); }} aria-label="Close review form"><X size={15} /></button></div>
              <div className="new-review-fields">
                {!editingReview && <>
                  <label>Property<select name="propertyId" defaultValue={selectedPropertyId ?? properties[0]?.id} required>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
                  <label>Stay date<input name="date" type="date" max={new Date().toISOString().slice(0, 10)} required /></label>
                  <label>Guest name<input name="guestName" maxLength={120} placeholder="Optional" /></label>
                  <label>Country<input name="country" maxLength={100} placeholder="Optional" /></label>
                  <label>Stay details<input name="stay" maxLength={120} placeholder="Optional" /></label>
                </>}
                <label>Score (0–10)<input name="score" type="number" min="0" max="10" step="0.1" defaultValue={editingReview?.score} required /></label>
                <label className="wide-field">Review title<input name="title" maxLength={300} defaultValue={editingReview?.title} placeholder="Guest review" /></label>
                <label className="wide-field">Positive feedback<textarea name="positive" maxLength={12000} rows={2} defaultValue={editingReview?.positive} /></label>
                <label className="wide-field">Concerns<textarea name="negative" maxLength={12000} rows={2} defaultValue={editingReview?.negative} /></label>
              </div>
              <button className="button button-dark" type="submit" disabled={reviewSaving}><Check size={13} />{reviewSaving ? "Saving…" : editingReview ? "Save changes" : "Save review"}</button>
            </form>}
            <div className="reviews-table">
              <div className="table-header"><span>GUEST</span><span>REVIEW</span><span>DATE & RESPONSE</span><span>SENTIMENT</span><span>MANAGE</span></div>
              {filteredReviews.length ? filteredReviews.map((review) => (
                <ReviewRow key={review.id} review={review} property={properties.find((property) => property.id === review.propertyId)} canManage={canManage} onEdit={() => { setEditingReview(review); setShowNewReview(true); }} onReply={() => void manageReview(review, "reply")} onDelete={() => void manageReview(review, "delete")} />
              )) : <div className="empty-reviews"><Search size={19} /><strong>{reviewLoading ? "Loading reviews…" : "No matching reviews"}</strong><span>Try a different search or clear some filters.</span></div>}
            </div>
            <div className="reviews-foot"><span>Showing {filteredReviews.length} of {reviewTotal} matching records</span>{filteredReviews.length < reviewTotal && <button className="text-button" disabled={reviewLoading} onClick={() => void loadMoreReviews()}>{reviewLoading ? "Loading…" : "Load more reviews"} <ArrowRight size={12} /></button>}<span><span className="data-pulse" /> {data.demoData ? "SYNTHETIC DEMO CONTENT" : "CONNECTED DATABASE CONTENT"}</span></div>
          </section>

          <footer className="page-footer">
            <div><span className="footer-mark">a.</span><span>Made for a more thoughtful stay.</span></div>
            <span>AZZURRO HOTELS · GUEST INTELLIGENCE · {new Date().getFullYear()}</span>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top <ArrowUpRight size={12} /></button>
          </footer>
        </div>
      </main>
      {mobileNavOpen && <button className="nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      {error && <div className="toast-error" role="alert">{error}<button onClick={() => setError("")}><X size={14} /></button></div>}
    </div>
  );
}
