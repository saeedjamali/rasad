import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    imageUrl: { type: String, default: "" },
    imageName: { type: String, default: "" },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
    roles: { type: [String], default: [] },
  },
  { timestamps: true }
);

delete mongoose.models.Announcement;

export default mongoose.model("Announcement", schema);
