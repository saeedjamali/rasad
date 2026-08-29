import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { json } from "@/lib/http";
import Applicant from "@/models/Applicant";
import { decorateApplicants } from "@/lib/regions";

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const item = await Applicant.findOne({
    $or: [{ personnelCode: user.personnelCode }, { mobile: user.mobile }],
  }).lean();
  return json({ item: item ? (await decorateApplicants([item]))[0] : null });
}
