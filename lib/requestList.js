import { ROLES, STATUSES } from "./constants";
import Applicant from "@/models/Applicant";

export function requestListFilter(role, user, q, status) {
  const filter = {};
  if (q) {
    filter.$or = [
      { trackingCode: new RegExp(q, "i") },
      { personnelCode: new RegExp(q, "i") },
      { mobile: new RegExp(q, "i") },
      { categoryTitle: new RegExp(q, "i") },
      { title: new RegExp(q, "i") },
    ];
  }
  if (role === ROLES.personnel) {
    filter.personnelCode = user.personnelCode;
  } else if (role === ROLES.district_transfer) {
    filter.assignedDistrictCode = user.districtCode;
  }

  if (status === "approved" || status === "rejected") {
    filter.status = STATUSES.REVIEW_RESULT;
    filter.result = status;
  } else if (status) {
    filter.status = status;
  } else if (role === ROLES.district_transfer) {
    filter.status = STATUSES.INQUIRY_DISTRICT;
  } else if (role === ROLES.province_planning) {
    filter.status = STATUSES.INQUIRY_PLANNING;
  }
  return filter;
}

export async function applyApplicantNameSearch(filter, q, role) {
  if (!q || role === ROLES.personnel) return filter;
  const nameHits = await Applicant.find({
    $or: [{ firstName: new RegExp(q, "i") }, { lastName: new RegExp(q, "i") }],
  })
    .select("personnelCode")
    .lean();
  const codes = nameHits.map((a) => a.personnelCode).filter(Boolean);
  if (codes.length) {
    filter.$or = [...(filter.$or || []), { personnelCode: { $in: codes } }];
  }
  return filter;
}
