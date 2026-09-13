import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    mobile: { type: String, required: true, unique: true, trim: true },
    personnelCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    roles: { type: [String], default: ["personnel"] },
    districtCode: { type: String, default: "" },
    provinceCode: { type: String, default: "17" },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    sessionEpoch: { type: Number, default: 0 },
  },
  { timestamps: true }
);

delete mongoose.models.User;

export default mongoose.model("User", schema);
