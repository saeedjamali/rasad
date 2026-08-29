import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    transferType: { type: String, default: "" },
    showDistricts: { type: Boolean, default: false },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    selectionType: { type: String, enum: ["single", "checklist", "none"], default: "none" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model("Category", schema);
