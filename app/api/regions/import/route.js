import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { mapRegionRow, sheetToJson, workbookFromBuffer } from "@/lib/excel";
import { ROLES } from "@/lib/constants";
import Region from "@/models/Region";
import { clearRegionCache } from "@/lib/regions";

export async function POST(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return fail("فایل اکسل ارسال نشده");

  let rows;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    rows = sheetToJson(workbookFromBuffer(buf));
  } catch (e) {
    return fail("فایل اکسل خوانده نشد. قالب xlsx با ستون‌های کد استان، کد منطقه و نام منطقه را ارسال کنید");
  }

  if (!rows.length) return fail("فایل خالی است یا ردیف عنوان یافت نشد");

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const data = mapRegionRow(rows[i]);
    if (!data.districtCode && !data.districtName) continue;
    if (!data.districtCode || !data.districtName) {
      errors.push(`ردیف ${i + 2}: کد منطقه و نام منطقه الزامی است`);
      continue;
    }
    if (!data.provinceCode) data.provinceCode = "17";
    try {
      const existing = await Region.findOne({ districtCode: data.districtCode });
      if (existing) {
        existing.provinceCode = data.provinceCode;
        existing.districtName = data.districtName;
        await existing.save();
        updated += 1;
      } else {
        await Region.create(data);
        created += 1;
      }
    } catch (e) {
      errors.push(`ردیف ${i + 2} (${data.districtCode}): ${e.message}`);
    }
  }

  if (!created && !updated && errors.length) {
    return json({
      created,
      updated,
      errors,
      message: errors[0] || "هیچ ردیفی از فایل خوانده نشد. ستون‌ها باید کد استان، کد منطقه و نام منطقه باشد.",
    });
  }
  clearRegionCache();
  return json({ created, updated, errors });
}
