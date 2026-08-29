import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    academicYear: String,
    personnelCode: { type: String, required: true, unique: true, trim: true, index: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    employmentType: String,
    gender: String,
    maritalStatus: String,
    childrenCount: String,
    civilRegistryStatus: String,
    serviceDistrict: String,
    originProvince: String,
    originDistrict: String,
    districtCode: String,
    type: String,
    transferType: String,
    category: String,
    categoryTitle: String,
    processCode: String,
    algorithmCode: String,
    processResult: String,
    cartableOrProcess: String,
    yearsOfService: String,
    educationLevel: String,
    employmentPosition: String,
    employmentField: String,
    spousePersonnelCode: String,
    status: String,
    finalStatus: String,
    trackingCode: String,
    destProvince: String,
    destDistrict: String,
    destCode: String,
    earnedScore: String,
    approvedScore: String,
    registeredAt: String,
    eventDate: String,
    editedAt: String,
    user: String,
    startDate: String,
    endDate: String,
  },
  { timestamps: true }
);

delete mongoose.models.Applicant;

export default mongoose.model("Applicant", schema);
