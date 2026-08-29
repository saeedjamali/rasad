import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    provinceCode: { type: String, required: true, trim: true, index: true },
    districtCode: { type: String, required: true, unique: true, trim: true },
    districtName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Region || mongoose.model("Region", schema);
