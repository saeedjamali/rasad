import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { ROLES, STATUSES, STATUS_LABELS } from "@/lib/constants";
import Request from "@/models/Request";
import Applicant from "@/models/Applicant";
import { findRegion, findRegionByName, loadRegionMap, regionLabel } from "@/lib/regions";

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

  const approved = byResult.find((x) => x._id === "approved")?.count || 0;
  const rejected = byResult.find((x) => x._id === "rejected")?.count || 0;
  const byStatusMap = Object.fromEntries(byStatus.map((x) => [x._id, x.count]));
  const inquiryRows = await Request.aggregate([
    { $match: { status: STATUSES.INQUIRY_DISTRICT } },
    {
      $group: {
        _id: {
          code: { $ifNull: ["$assignedDistrictCode", ""] },
          name: { $ifNull: ["$assignedDistrictName", ""] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
  const regionMap = await loadRegionMap();
  const byInquiryDistrict = inquiryRows.map((r) => {
    const code = r._id.code || "";
    const region = findRegion(regionMap, code) || findRegionByName(regionMap, r._id.name);
    const districtCode = region?.districtCode || code;
    const districtName = region?.districtName || r._id.name || "";
    return {
      districtCode,
      districtName,
      label: region
        ? regionLabel(region)
        : [districtCode, districtName].filter(Boolean).join(" — ") || "نامشخص",
      count: r.count,
    };
  });
  const inquiryTotal = byInquiryDistrict.reduce((n, r) => n + r.count, 0);
  const sortedCategory = [...byCategory].sort((a, b) => b.count - a.count || String(a._id || "").localeCompare(String(b._id || ""), "fa"));

  return json({
    total: await Request.countDocuments(),
    applicantTotal: await Applicant.countDocuments(),
    approved,
    rejected,
    inquiryTotal,
    byStatus: Object.values(STATUSES).map((status) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count: byStatusMap[status] || 0,
      ...(status === STATUSES.REVIEW_RESULT ? { approved, rejected } : {}),
    })),
    byResult,
    byCategory: sortedCategory,
    byInquiryDistrict,
    byApplicantCategoryFinal: pivotCategoryFinal(applicantCategoryFinal),
  });
}
