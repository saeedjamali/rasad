import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { mapPersonnelRow, sheetToJson, workbookFromBuffer } from "@/lib/excel";
import { upsertPersonnelProfile } from "@/lib/personnel";
import { ROLES } from "@/lib/constants";

export async function POST(req) {
  const { session, error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return fail("فایل اکسل ارسال نشده");
  const rows = sheetToJson(workbookFromBuffer(Buffer.from(await file.arrayBuffer())));
  let created = 0;
  let updated = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const data = mapPersonnelRow(rows[i]);
    try {
      const result = await upsertPersonnelProfile(data);
      if (result.created) created += 1;
      else updated += 1;
    } catch (e) {
      errors.push(`ردیف ${i + 2}: ${e.message}`);
    }
  }
  await addAudit(
    session,
    "personnel_import",
    "Personnel",
    "",
    { created, updated, errors: errors.length },
    clientIp(req)
  );
  return json({ created, updated, errors });
}
