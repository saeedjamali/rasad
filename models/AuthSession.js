import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    sid: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ userId: 1, revokedAt: 1, lastSeenAt: -1 });

delete mongoose.models.AuthSession;

export default mongoose.model("AuthSession", schema);
