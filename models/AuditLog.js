import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    actorUserId: Schema.Types.ObjectId,
    actorPersonnelCode: String,
    actorRole: String,
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    detail: { type: Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: true }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", schema);
