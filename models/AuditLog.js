import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    actorUserId: Schema.Types.ObjectId,
    actorPersonnelCode: String,
    actorMobile: String,
    actorRole: String,
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    detail: { type: Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: true }
);

delete mongoose.models.AuditLog;

export default mongoose.model("AuditLog", schema);
