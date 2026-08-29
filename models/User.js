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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", schema);
