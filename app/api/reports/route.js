import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { ROLES, STATUSES, STATUS_LABELS } from "@/lib/constants";
import Request from "@/models/Request";
import Applicant from "@/models/Applicant";

function pivotCategoryFinal(rows) {
  const statusSet = new Set();
  const byCat = new Map();
  for (const r of rows) {
    const categoryTitle = String(r._id?.categoryTitle || "").trim() || "بدون عنوان دسته";
    const finalStatus = String(r._id?.finalStatus || "").trim() || "نامشخص";
    statusSet.add(finalStatus);
    if (!byCat.has(categoryTitle)) {
      byCat.set(categoryTitle, { categoryTitle, counts: {}, total: 0 });
    }
    const row = byCat.get(categoryTitle);
    row.counts[finalStatus] = (row.counts[finalStatus] || 0) + r.count;
    row.total += r.count;
  }
  const statuses = [...statusSet].sort((a, b) => a.localeCompare(b, "fa"));
  const list = [...byCat.values()].sort(
    (a, b) => b.total - a.total || a.categoryTitle.localeCompare(b.categoryTitle, "fa")
  );
  const statusTotals = Object.fromEntries(
    statuses.map((s) => [s, list.reduce((n, row) => n + (row.counts[s] || 0), 0)])
  );
  return {
    statuses,
    rows: list,
    statusTotals,
    total: list.reduce((n, row) => n + row.total, 0),
  };
}

export async function GET() {
  const { error } = await requireUser([
    ROLES.hr_manager,
    ROLES.director_general,
    ROLES.admin,
    ROLES.province_transfer,
  ]);
  if (error) return error;
  await connectDB();

  const byStatus = await Request.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const byResult = await Request.aggregate([
    { $match: { status: STATUSES.REVIEW_RESULT } },
    { $group: { _id: "$result", count: { $sum: 1 } } },
  ]);
  const byCategory = await Request.aggregate([
    { $group: { _id: "$categoryTitle", count: { $sum: 1 } } },
  ]);
  const applicantCategoryFinal = await Applicant.aggregate([
    {
      $group: {
        _id: {
          categoryTitle: { $ifNull: ["$categoryTitle", ""] },
          finalStatus: { $ifNull: ["$finalStatus", ""] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  return json({
    total: await Request.countDocuments(),
    applicantTotal: await Applicant.countDocuments(),
    byStatus: byStatus.map((x) => ({
      status: x._id,
      label: STATUS_LABELS[x._id] || x._id,
      count: x.count,
    })),
    byResult,
    byCategory,
    byApplicantCategoryFinal: pivotCategoryFinal(applicantCategoryFinal),
  });
}
