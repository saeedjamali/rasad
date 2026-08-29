import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { applicantsToRows, jsonToBuffer } from "@/lib/excel";
import { ROLES } from "@/lib/constants";
import Applicant from "@/models/Applicant";
import { decorateApplicants } from "@/lib/regions";

export async function GET() {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const list = await decorateApplicants(await Applicant.find().lean());
  const buf = jsonToBuffer(applicantsToRows(list), "applicants");
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=applicants.xlsx",
    },
  });
}
