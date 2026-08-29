import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "Request", required: true, index: true },
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    actorPersonnelCode: String,
    actorMobile: String,
    actorName: String,
    comment: { type: String, default: "" },
    attachments: [{ url: String, name: String, size: Number }],
    visibleToUser: { type: Boolean, default: false },
    visibleToProvinceOnly: { type: Boolean, default: false },
    visibleToDistrictOnly: { type: Boolean, default: false },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

delete mongoose.models.RequestLog;

export default mongoose.model("RequestLog", schema);
