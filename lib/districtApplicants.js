import Applicant from "@/models/Applicant";
import Personnel from "@/models/Personnel";
import { ROLES } from "./constants";
import { fail } from "./http";
import { validatePersonnelCode } from "./identity";
import { decoratePersonnel } from "./regions";
import { getSettings } from "./settings";

export const APPLICANT_MANAGER_ROLES = [
  ROLES.province_transfer,
  ROLES.admin,
  ROLES.district_transfer,
];

export function isDistrictApplicantRole(role) {
  return role === ROLES.district_transfer;
}

export async function assertDistrictCanManageApplicants(user, role) {
  if (!isDistrictApplicantRole(role)) return { ok: true };
  const settings = await getSettings();
  if (!settings.allowDistrictAddApplicant) {
    return {
      ok: false,
      error: fail("امکان افزودن متقاضی برای کارشناس انتقالات منطقه از تنظیمات سامانه غیرفعال است", 403),
    };
  }
  if (!user?.districtCode) {
    return { ok: false, error: fail("منطقه کارشناس مشخص نیست", 403) };
  }
  return { ok: true };
}

export async function applicantDistrictFilter(districtCode) {
  const people = await Personnel.find({ districtCode }).select("personnelCode").lean();
  const codes = people.map((p) => p.personnelCode).filter(Boolean);
  const or = [{ districtCode }];
  if (codes.length) or.push({ personnelCode: { $in: codes } });
  return { $or: or };
}

export function mergeMongoFilter(base, extra) {
  if (!extra) return base || {};
  if (!base || !Object.keys(base).length) return extra;
  return { $and: [base, extra] };
}

export async function applicantInExpertDistrict(item, districtCode) {
  if (!item) return false;
  if (String(item.districtCode || "") === String(districtCode)) return true;
  if (!item.personnelCode) return false;
  const personnel = await Personnel.findOne({ personnelCode: item.personnelCode })
    .select("districtCode")
    .lean();
  return String(personnel?.districtCode || "") === String(districtCode);
}

export function applicantPayloadFromPersonnel(personnel, body = {}) {
  const districtName = personnel.districtName || body.originDistrict || body.serviceDistrict || "";
  return {
    personnelCode: personnel.personnelCode,
    firstName: personnel.firstName || "",
    lastName: personnel.lastName || "",
    mobile: body.mobile,
    districtCode: personnel.districtCode,
    originDistrict: districtName,
    serviceDistrict: districtName,
    originProvince: body.originProvince || "خراسان رضوی",
    destCode: body.destCode || "",
    destDistrict: body.destDistrict || "",
    destProvince: body.destProvince || "خراسان رضوی",
    academicYear: body.academicYear,
    status: body.status,
  };
}

export async function lookupPersonnelForDistrict(personnelCode, districtCode) {
  const code = validatePersonnelCode(personnelCode);
  if (!code.ok) return { ok: false, reason: "invalid", message: code.message };
  const raw = await Personnel.findOne({ personnelCode: code.value }).lean();
  if (!raw) {
    return {
      ok: false,
      reason: "missing",
      message: "این کد پرسنلی در اطلاعات پرسنل ثبت نشده است و امکان افزودن وجود ندارد.",
    };
  }
  if (String(raw.districtCode) !== String(districtCode)) {
    return {
      ok: false,
      reason: "district",
      message: "فقط پرسنل همان منطقه خود را می‌توانید اضافه کنید.",
    };
  }
  const item = (await decoratePersonnel([raw]))[0];
  const existing = await Applicant.findOne({ personnelCode: code.value }).select("_id").lean();
  return { ok: true, item, alreadyApplicant: Boolean(existing) };
}
