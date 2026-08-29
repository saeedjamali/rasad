import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { validatePersonnelCode } from "@/lib/identity";
import { decoratePersonnel } from "@/lib/regions";
import Personnel from "@/models/Personnel";
import {
  APPLICANT_MANAGER_ROLES,
  assertDistrictCanManageApplicants,
  isDistrictApplicantRole,
  lookupPersonnelForDistrict,
} from "@/lib/districtApplicants";

export async function GET(req) {
  const { user, role, error } = await requireUser(APPLICANT_MANAGER_ROLES);
  if (error) return error;
  await connectDB();
  const gate = await assertDistrictCanManageApplicants(user, role);
  if (!gate.ok) return gate.error;
  const code = validatePersonnelCode(new URL(req.url).searchParams.get("code"));
  if (!code.ok) return fail(code.message);
  if (isDistrictApplicantRole(role)) {
    const found = await lookupPersonnelForDistrict(code.value, user.districtCode);
    if (!found.ok) {
      return json({ item: null, reason: found.reason, message: found.message });
    }
    return json({
      item: found.item,
      alreadyApplicant: found.alreadyApplicant,
    });
  }
  const item = await Personnel.findOne({ personnelCode: code.value }).lean();
  if (!item) return json({ item: null });
  return json({ item: (await decoratePersonnel([item]))[0] });
}
