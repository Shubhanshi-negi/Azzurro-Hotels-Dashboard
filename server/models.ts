import mongoose, { Schema } from "mongoose";
import type { GuestReview, HotelProperty } from "../lib/types";

const categorySchema = new Schema(
  {
    cleanliness: { type: Number, min: 0, max: 10 },
    comfort: { type: Number, min: 0, max: 10 },
    staff: { type: Number, min: 0, max: 10 },
    facilities: { type: Number, min: 0, max: 10 },
    location: { type: Number, min: 0, max: 10 },
    value: { type: Number, min: 0, max: 10 },
  },
  { _id: false },
);

const propertySchema = new Schema<HotelProperty>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    region: { type: String, required: true },
    address: { type: String, required: true },
    rating: { type: Number, required: true },
    reviewCount: { type: Number, required: true },
    image: { type: String, required: true },
    accent: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    accommodationStyle: { type: String, required: true },
    officialUrl: { type: String, required: true },
    categories: { type: categorySchema, required: true },
  },
  { timestamps: true, versionKey: false },
);

const reviewSchema = new Schema<GuestReview>(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, required: true, index: true },
    guestName: { type: String, required: true },
    country: { type: String, required: true },
    date: { type: String, required: true },
    stay: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    sentiment: {
      type: String,
      enum: ["positive", "mixed", "negative", "unanalysed"],
      default: "unanalysed",
      required: true,
    },
    title: { type: String, required: true },
    positive: { type: String, default: "" },
    negative: { type: String, default: "" },
    replyStatus: { type: String, enum: ["Replied", "Needs reply"], required: true },
    isDemo: { type: Boolean, required: true, default: false },
    source: { type: String, enum: ["demo", "import", "manual"], required: true, default: "manual" },
    sourceRef: { type: String },
    categoryRatings: { type: categorySchema },
    analysisStatus: { type: String, enum: ["unanalysed", "complete"], default: "unanalysed" },
    analysisProvider: { type: String },
    topics: { type: [String], default: [] },
    analyzedAt: { type: String },
  },
  { timestamps: true, versionKey: false },
);
reviewSchema.index({ propertyId: 1, date: -1 });
reviewSchema.index(
  { propertyId: 1, sourceRef: 1 },
  { unique: true, partialFilterExpression: { sourceRef: { $type: "string" } } },
);

export const PropertyModel =
  (mongoose.models.Property as mongoose.Model<HotelProperty> | undefined) ??
  mongoose.model<HotelProperty>("Property", propertySchema);
export const ReviewModel =
  (mongoose.models.Review as mongoose.Model<GuestReview> | undefined) ??
  mongoose.model<GuestReview>("Review", reviewSchema);
