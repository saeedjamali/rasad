import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { ROLES } from "@/lib/constants";
import { validatePersonnelCode } from "@/lib/identity";
import { decoratePersonnel } from "@/lib/regions";
import { findPaged, parsePaging } from "@/lib/pagination";
import Personnel from "@/models/Personnel";
import { personnelSearchFilter, upsertPersonnelProfile } from "@/lib/personnel";

export async function GET(req) {
  const { error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const paging = parsePaging(searchParams);
  const filter = await personnelSearchFilter(q);
  const result = await findPaged(Personnel, filter, { updatedAt: -1 }, paging);
  return json({ ...result, list: await decoratePersonnel(result.list) });
}

export async function POST(req) {
  const { session, error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  const code = validatePersonnelCode(body.personnelCode);
  if (!code.ok) return fail(code.message);
  try {
    if (await Personnel.findOne({ personnelCode: code.value })) {
      return fail("این کد پرسنلی قبلاً در اطلاعات پرسنل ثبت شده است");
    }
    const { item } = await upsertPersonnelProfile(body);
    await addAudit(session, "personnel_create", "Personnel", item._id, body, clientIp(req));
    return json({
      item: (await decoratePersonnel([item.toObject()]))[0],
      message: "پرسنل در جدول اطلاعات پرسنل ثبت شد.",
    });
  } catch (e) {
    return fail(e.message);
  }
}
