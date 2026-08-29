import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    personnelCode: { type: String, required: true, unique: true, trim: true, index: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    districtCode: { type: String, default: "", trim: true, index: true },
  },
  { timestamps: true, collection: "personnel" }
);

delete mongoose.models.Personnel;

export default mongoose.model("Personnel", schema);
