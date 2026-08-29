import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { mapApplicantRow, sheetToJson, workbookFromBuffer } from "@/lib/excel";
import {
  assertApplicantIdentityAvailable,
  duplicateIdentityMessage,
  ensureUserFromApplicant,
  validateMobile,
  validatePersonnelCode,
} from "@/lib/usersync";
import { upsertPersonnelProfile } from "@/lib/personnel";
import { ROLES, DEFAULT_APPLICANT_STATUS } from "@/lib/constants";
import Applicant from "@/models/Applicant";
import { applyRegionNames } from "@/lib/regions";

export async function POST(req) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") || "upsert";
  if (!file || typeof file === "string") return fail("فایل اکسل ارسال نشده");
  const buf = Buffer.from(await file.arrayBuffer());
  const rows = sheetToJson(workbookFromBuffer(buf));
  let created = 0;
  let updated = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const data = mapApplicantRow(rows[i]);
    try {
      const code = validatePersonnelCode(data.personnelCode);
      if (!code.ok) throw new Error(code.message);
      const mob = validateMobile(data.mobile);
      if (!mob.ok) throw new Error(mob.message);
      data.personnelCode = code.value;
      data.mobile = mob.value;
      await applyRegionNames(data);
      const existing = await Applicant.findOne({ personnelCode: data.personnelCode });
      const identity = await assertApplicantIdentityAvailable({
        ...data,
        excludeApplicantId: existing?._id,
      });
      data.personnelCode = identity.personnelCode;
      data.mobile = identity.mobile;
      if (existing) {
        if (mode === "create") {
          errors.push(`ردیف ${i + 2}: کد پرسنلی تکراری است (${data.personnelCode})`);
          continue;
        }
        await ensureUserFromApplicant(data);
        try {
          await upsertPersonnelProfile(data);
        } catch {
          /* incomplete applicant row can skip personnel sync */
        }
        existing.set(data);
        await existing.save();
        updated += 1;
      } else {
        await ensureUserFromApplicant(data);
        try {
          await upsertPersonnelProfile(data);
        } catch {
          /* incomplete applicant row can skip personnel sync */
        }
        await Applicant.create({
          ...data,
          status: data.status || DEFAULT_APPLICANT_STATUS,
        });
        created += 1;
      }
    } catch (e) {
      errors.push(`ردیف ${i + 2}: ${duplicateIdentityMessage(e) || e.message}`);
    }
  }
  await addAudit(
    session,
    "applicant_import",
    "Applicant",
    "",
    { created, updated, errors: errors.length },
    clientIp(req)
  );
  return json({ created, updated, errors });
}
