import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { mapUserRow, sheetToJson, workbookFromBuffer } from "@/lib/excel";
import { normalizeMobile } from "@/lib/usersync";
import { ROLES } from "@/lib/constants";
import User from "@/models/User";
import { applyUserRegion } from "@/lib/regions";

export async function POST(req) {
  const { session, error } = await requireUser([ROLES.admin]);
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
    const data = mapUserRow(rows[i]);
    data.mobile = normalizeMobile(data.mobile);
    if (!data.mobile || !data.personnelCode) {
      errors.push(`ردیف ${i + 2}: شماره همراه یا کد پرسنلی خالی است`);
      continue;
    }
    try {
      await applyUserRegion(data);
      const existing = await User.findOne({
        $or: [{ mobile: data.mobile }, { personnelCode: data.personnelCode }],
      });
      const payload = {
        mobile: data.mobile,
        personnelCode: data.personnelCode,
        fullName: data.fullName,
        roles: data.roles,
        districtCode: data.districtCode,
        provinceCode: data.provinceCode || "17",
        isActive: data.isActive !== false,
        isLocked: !!data.isLocked,
      };
      if (data.password) payload.passwordHash = await bcrypt.hash(data.password, 10);
      if (existing) {
        if (existing.mobile !== data.mobile) {
          const taken = await User.findOne({
            mobile: data.mobile,
            _id: { $ne: existing._id },
          });
          if (taken) throw new Error("شماره همراه تکراری");
        }
        existing.set(payload);
        await existing.save();
        updated += 1;
      } else {
        await User.create(payload);
        created += 1;
      }
    } catch (e) {
      errors.push(`ردیف ${i + 2}: ${e.message}`);
    }
  }
  await addAudit(session, "user_import", "User", "", { created, updated }, clientIp(req));
  return json({ created, updated, errors });
}
