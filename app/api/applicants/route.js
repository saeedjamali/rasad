import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { ensureUserFromApplicant, assertApplicantIdentityAvailable, duplicateIdentityMessage } from "@/lib/usersync";
import { upsertPersonnelProfile } from "@/lib/personnel";
import { missingApplicantRequired, DEFAULT_APPLICANT_STATUS } from "@/lib/constants";
import Applicant from "@/models/Applicant";
import { applyRegionNames, decorateApplicants } from "@/lib/regions";
import { findPaged, parsePaging } from "@/lib/pagination";
import {
  APPLICANT_MANAGER_ROLES,
  applicantDistrictFilter,
  applicantPayloadFromPersonnel,
  assertDistrictCanManageApplicants,
  isDistrictApplicantRole,
  lookupPersonnelForDistrict,
  mergeMongoFilter,
} from "@/lib/districtApplicants";

export async function GET(req) {
  const { user, role, error } = await requireUser(APPLICANT_MANAGER_ROLES);
  if (error) return error;
  await connectDB();
  const gate = await assertDistrictCanManageApplicants(user, role);
  if (!gate.ok) return gate.error;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const paging = parsePaging(searchParams);
  const searchFilter = q
    ? {
        $or: [
          { personnelCode: new RegExp(q, "i") },
          { firstName: new RegExp(q, "i") },
          { lastName: new RegExp(q, "i") },
          { mobile: new RegExp(q, "i") },
          { originDistrict: new RegExp(q, "i") },
          { destDistrict: new RegExp(q, "i") },
          { districtCode: new RegExp(q, "i") },
          { destCode: new RegExp(q, "i") },
          { serviceDistrict: new RegExp(q, "i") },
        ],
      }
    : {};
  const districtFilter = isDistrictApplicantRole(role)
    ? await applicantDistrictFilter(user.districtCode)
    : null;
  const filter = mergeMongoFilter(searchFilter, districtFilter);
  const result = await findPaged(Applicant, filter, { updatedAt: -1 }, paging);
  return json({ ...result, list: await decorateApplicants(result.list) });
}

export async function POST(req) {
  const { session, user, role, error } = await requireUser(APPLICANT_MANAGER_ROLES);
  if (error) return error;
  await connectDB();
  const gate = await assertDistrictCanManageApplicants(user, role);
  if (!gate.ok) return gate.error;
  const body = await readJson(req);
  const districtMode = isDistrictApplicantRole(role);
  let payload = body;
  if (districtMode) {
    const found = await lookupPersonnelForDistrict(body.personnelCode, user.districtCode);
    if (!found.ok) return fail(found.message);
    if (found.alreadyApplicant) return fail("این فرد قبلاً در فهرست متقاضیان ثبت شده است");
    payload = applicantPayloadFromPersonnel(found.item, body);
    payload.districtCode = user.districtCode;
  }
  await applyRegionNames(payload);
  try {
    const identity = await assertApplicantIdentityAvailable(payload);
    payload.personnelCode = identity.personnelCode;
    payload.mobile = identity.mobile;
  } catch (e) {
    return fail(e.message);
  }
  const missing = missingApplicantRequired(payload);
  if (missing) return fail(missing);
  payload.status = DEFAULT_APPLICANT_STATUS;
  try {
    const { created } = await ensureUserFromApplicant(payload);
    const personnel = districtMode ? { created: false } : await upsertPersonnelProfile(payload);
    const doc = await Applicant.create(payload);
    await addAudit(session, "applicant_create", "Applicant", doc._id, payload, clientIp(req));
    const parts = [];
    parts.push(
      created
        ? "متقاضی ثبت شد و حساب کاربری با نقش پرسنل در جدول کاربران ایجاد شد."
        : "متقاضی ثبت شد و نقش پرسنل به کاربر موجود در جدول کاربران اضافه شد."
    );
    if (!districtMode) {
      parts.push(
        personnel.created
          ? "همین فرد در اطلاعات پرسنل هم ثبت شد."
          : "اطلاعات پرسنل این کد به‌روزرسانی شد."
      );
    }
    return json({
      item: doc,
      userCreated: created,
      personnelCreated: personnel.created,
      message: parts.join(" "),
    });
  } catch (e) {
    return fail(duplicateIdentityMessage(e) || e.message);
  }
}
