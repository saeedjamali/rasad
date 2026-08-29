import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    key: { type: String, default: "app", unique: true },
    allowNewRequestAfterFinal: { type: Boolean, default: false },
    allowDistrictAddApplicant: { type: Boolean, default: false },
    allowPasswordLogin: { type: Boolean, default: false },
    smsOnline: { type: Boolean, default: false },
    systemEnabled: { type: Boolean, default: true },
    allowRequestExcelExport: { type: Schema.Types.Mixed, default: undefined },
    allowReportLookup: { type: Schema.Types.Mixed, default: undefined },
    services: { type: Array, default: undefined },
  },
  { timestamps: true }
);

delete mongoose.models.Setting;

export default mongoose.model("Setting", schema);
