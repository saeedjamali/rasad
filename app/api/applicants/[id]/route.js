import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import {
  assertApplicantIdentityAvailable,
  duplicateIdentityMessage,
  ensureUserFromApplicant,
} from "@/lib/usersync";
import { upsertPersonnelProfile } from "@/lib/personnel";
import { missingApplicantRequired, ROLES } from "@/lib/constants";
import Applicant from "@/models/Applicant";
import { applyRegionNames, decorateApplicants } from "@/lib/regions";
import {
  APPLICANT_MANAGER_ROLES,
  applicantInExpertDistrict,
  assertDistrictCanManageApplicants,
  isDistrictApplicantRole,
} from "@/lib/districtApplicants";

export async function GET(_req, { params }) {
  const { user, role, error } = await requireUser(APPLICANT_MANAGER_ROLES);
  if (error) return error;
  await connectDB();
  const gate = await assertDistrictCanManageApplicants(user, role);
  if (!gate.ok) return gate.error;
  const { id } = await params;
  const item = await Applicant.findById(id).lean();
  if (!item) return fail("یافت نشد", 404);
  if (isDistrictApplicantRole(role) && !(await applicantInExpertDistrict(item, user.districtCode))) {
    return fail("دسترسی مجاز نیست", 403);
  }
  return json({ item: (await decorateApplicants([item]))[0] });
}

export async function PUT(req, { params }) {
  const { session, user, role, error } = await requireUser(APPLICANT_MANAGER_ROLES);
  if (error) return error;
  await connectDB();
  const gate = await assertDistrictCanManageApplicants(user, role);
  if (!gate.ok) return gate.error;
  const { id } = await params;
  const body = await readJson(req);
  const item = await Applicant.findById(id);
  if (!item) return fail("یافت نشد", 404);
  const districtMode = isDistrictApplicantRole(role);
  if (districtMode && !(await applicantInExpertDistrict(item, user.districtCode))) {
    return fail("دسترسی مجاز نیست", 403);
  }

  if (districtMode) {
    try {
      const identity = await assertApplicantIdentityAvailable({
        personnelCode: item.personnelCode,
        mobile: body.mobile,
        excludeApplicantId: item._id,
      });
      item.mobile = identity.mobile;
      await item.save();
      await ensureUserFromApplicant(item.toObject());
      await addAudit(session, "applicant_update", "Applicant", item._id, { mobile: identity.mobile }, clientIp(req));
      return json({
        item,
        message: "شماره همراه متقاضی به‌روزرسانی شد.",
      });
    } catch (e) {
      return fail(duplicateIdentityMessage(e) || e.message);
    }
  }

  const merged = { ...item.toObject(), ...body };
  await applyRegionNames(merged);
  try {
    const identity = await assertApplicantIdentityAvailable({
      ...merged,
      excludeApplicantId: item._id,
    });
    merged.personnelCode = identity.personnelCode;
    merged.mobile = identity.mobile;
    body.personnelCode = identity.personnelCode;
    body.mobile = identity.mobile;
  } catch (e) {
    return fail(e.message);
  }
  const missing = missingApplicantRequired(merged);
  if (missing) return fail(missing);
  try {
    await ensureUserFromApplicant(merged);
    await upsertPersonnelProfile(merged);
    item.set(body);
    await item.save();
    await addAudit(session, "applicant_update", "Applicant", item._id, body, clientIp(req));
    return json({
      item,
      message: "اطلاعات متقاضی به‌روزرسانی شد و حساب کاربری و اطلاعات پرسنل همگام شد.",
    });
  } catch (e) {
    return fail(duplicateIdentityMessage(e) || e.message);
  }
}

export async function DELETE(_req, { params }) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Applicant.findByIdAndDelete(id);
  if (!item) return fail("یافت نشد", 404);
  await addAudit(session, "applicant_delete", "Applicant", id, {}, "");
  return json({ ok: true });
}
