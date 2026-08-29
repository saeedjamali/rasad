import User from "@/models/User";
import Applicant from "@/models/Applicant";
import { ROLES, applicantFullName } from "./constants";
import { applyUserRegion } from "./regions";
import {
  duplicateIdentityMessage,
  normalizeMobile,
  validateMobile,
  validatePersonnelCode,
} from "./identity";

export { normalizeMobile, validateMobile, validatePersonnelCode, duplicateIdentityMessage };

export async function assertApplicantIdentityAvailable({
  personnelCode,
  mobile,
  excludeApplicantId,
} = {}) {
  const code = validatePersonnelCode(personnelCode);
  if (!code.ok) throw new Error(code.message);
  const mob = validateMobile(mobile);
  if (!mob.ok) throw new Error(mob.message);

  const codeFilter = { personnelCode: code.value };
  if (excludeApplicantId) codeFilter._id = { $ne: excludeApplicantId };
  if (await Applicant.findOne(codeFilter)) {
    throw new Error("این کد پرسنلی قبلاً برای متقاضی دیگری ثبت شده است");
  }

  const mobileFilter = { mobile: mob.value };
  if (excludeApplicantId) mobileFilter._id = { $ne: excludeApplicantId };
  if (await Applicant.findOne(mobileFilter)) {
    throw new Error("این شماره همراه قبلاً برای متقاضی دیگری ثبت شده است");
  }

  const userMobileConflict = await User.findOne({
    mobile: mob.value,
    personnelCode: { $ne: code.value },
  });
  if (userMobileConflict) {
    throw new Error("این شماره همراه متعلق به کاربر دیگری است و قابل استفاده نیست");
  }

  return { personnelCode: code.value, mobile: mob.value };
}

export async function ensureUserFromApplicant(data, extra = {}) {
  const code = validatePersonnelCode(data.personnelCode);
  if (!code.ok) throw new Error(code.message);
  const mob = validateMobile(data.mobile);
  if (!mob.ok) throw new Error(mob.message);

  const personnelCode = code.value;
  const mobile = mob.value;
  const existing = await User.findOne({ personnelCode });
  await applyUserRegion(data);
  const payload = {
    mobile,
    personnelCode,
    fullName: extra.fullName || applicantFullName(data) || existing?.fullName || "",
    districtCode: data.districtCode || existing?.districtCode || "",
    isActive: true,
  };
  if (existing) {
    if (existing.mobile !== mobile) {
      const taken = await User.findOne({ mobile, _id: { $ne: existing._id } });
      if (taken) throw new Error("این شماره همراه متعلق به کاربر دیگری است و قابل استفاده نیست");
    }
    existing.set(payload);
    const roles = new Set(existing.roles || []);
    roles.add(ROLES.personnel);
    existing.roles = [...roles];
    await existing.save();
    return { user: existing, created: false };
  }
  const user = await User.create({
    ...payload,
    roles: extra.roles?.length ? [...new Set([...extra.roles, ROLES.personnel])] : [ROLES.personnel],
    provinceCode: extra.provinceCode || "17",
  });
  return { user, created: true };
}
