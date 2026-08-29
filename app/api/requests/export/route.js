import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { jsonToBuffer, requestsToRows } from "@/lib/excel";
import Applicant from "@/models/Applicant";
import Request from "@/models/Request";
import { decorateRequests } from "@/lib/regions";
import { applyApplicantNameSearch, requestListFilter } from "@/lib/requestList";
import { canExportRequests, getSettings } from "@/lib/settings";

export async function GET(req) {
  const { user, role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const settings = await getSettings();
  if (!canExportRequests(role, settings)) {
    return fail("خروجی اکسل درخواست‌ها برای نقش شما فعال نیست", 403);
  }

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const filter = await applyApplicantNameSearch(
    requestListFilter(role, user, q, sp.get("status") || ""),
    q,
    role
  );
  const list = await Request.find(filter).sort({ updatedAt: -1 }).lean();
  const decorated = await decorateRequests(list);
  const codes = [...new Set(decorated.map((r) => r.personnelCode).filter(Boolean))];
  const applicants = codes.length
    ? await Applicant.find({ personnelCode: { $in: codes } })
        .select("personnelCode firstName lastName")
        .lean()
    : [];
  const byCode = Object.fromEntries(applicants.map((a) => [a.personnelCode, a]));
  const rows = requestsToRows(
    decorated.map((r) => ({
      ...r,
      firstName: byCode[r.personnelCode]?.firstName || "",
      lastName: byCode[r.personnelCode]?.lastName || "",
    }))
  );
  const buf = jsonToBuffer(rows, "requests");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=requests.xlsx",
    },
  });
}
