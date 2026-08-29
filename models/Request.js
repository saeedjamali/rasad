import mongoose, { Schema } from "mongoose";
import { STATUSES } from "@/lib/constants";

const fileSchema = new Schema(
  {
    url: String,
    name: String,
    size: Number,
  },
  { _id: false }
);

const schema = new Schema(
  {
    trackingCode: { type: String, required: true, unique: true },
    personnelCode: { type: String, required: true, index: true },
    mobile: { type: String, required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    categoryTitle: String,
    subcategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    subcategoryTitles: [String],
    proposedDistrictCode: String,
    proposedDistrictName: String,
    title: { type: String, default: "", trim: true },
    description: String,
    attachments: [fileSchema],
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.WAITING_PROVINCE_REVIEW,
      index: true,
    },
    result: { type: String, default: "" },
    assignedDistrictCode: String,
    assignedDistrictName: String,
    districtInquiryNote: { type: String, default: "" },
    openedBy: { type: Schema.Types.ObjectId, ref: "User" },
    openedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

delete mongoose.models.Request;

export default mongoose.model("Request", schema);
