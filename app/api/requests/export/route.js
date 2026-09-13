import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { jsonToBuffer, requestsToRows } from "@/lib/excel";
import Applicant from "@/models/Applicant";
import Request from "@/models/Request";
import { decorateApplicant, decorateRequests, loadRegionMap } from "@/lib/regions";
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
        .select("personnelCode firstName lastName destDistrict destCode destProvince")
        .lean()
    : [];
  const map = await loadRegionMap();
  const byCode = Object.fromEntries(applicants.map((a) => [a.personnelCode, decorateApplicant(a, map)]));
  const rows = requestsToRows(
    decorated.map((r) => {
      const applicant = byCode[r.personnelCode] || {};
      return {
        ...r,
        firstName: applicant.firstName || "",
        lastName: applicant.lastName || "",
        destDistrict: applicant.destDistrict || "",
        destCode: applicant.destCode || "",
        destRegionLabel: applicant.destRegionLabel || "",
      };
    })
  );
  const buf = jsonToBuffer(rows, "requests");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=requests.xlsx",
    },
  });
}
