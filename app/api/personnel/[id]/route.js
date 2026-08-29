import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { ROLES } from "@/lib/constants";
import { validatePersonnelCode } from "@/lib/identity";
import { applyUserRegion, decoratePersonnel } from "@/lib/regions";
import Personnel from "@/models/Personnel";

export async function GET(_req, { params }) {
  const { error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Personnel.findById(id).lean();
  if (!item) return fail("یافت نشد", 404);
  return json({ item: (await decoratePersonnel([item]))[0] });
}

export async function PUT(req, { params }) {
  const { session, error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Personnel.findById(id);
  if (!item) return fail("یافت نشد", 404);
  const body = await readJson(req);
  const nextCode = validatePersonnelCode(body.personnelCode ?? item.personnelCode);
  if (!nextCode.ok) return fail(nextCode.message);
  if (nextCode.value !== item.personnelCode) {
    if (await Personnel.findOne({ personnelCode: nextCode.value, _id: { $ne: item._id } })) {
      return fail("این کد پرسنلی قبلاً در اطلاعات پرسنل ثبت شده است");
    }
  }
  const firstName = String(body.firstName ?? item.firstName ?? "").trim();
  const lastName = String(body.lastName ?? item.lastName ?? "").trim();
  if (!firstName) return fail("نام الزامی است");
  if (!lastName) return fail("نام خانوادگی الزامی است");
  const region = {
    districtCode: body.districtCode ?? item.districtCode,
    districtName: body.districtName || body.originDistrict || body.serviceDistrict || "",
  };
  await applyUserRegion(region);
  if (!region.districtCode) return fail("منطقه الزامی است");
  item.set({
    personnelCode: nextCode.value,
    firstName,
    lastName,
    districtCode: region.districtCode,
  });
  await item.save();
  await addAudit(session, "personnel_update", "Personnel", item._id, body, clientIp(req));
  return json({
    item: (await decoratePersonnel([item.toObject()]))[0],
    message: "اطلاعات پرسنل به‌روزرسانی شد.",
  });
}

export async function DELETE(_req, { params }) {
  const { session, error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Personnel.findByIdAndDelete(id);
  if (!item) return fail("یافت نشد", 404);
  await addAudit(session, "personnel_delete", "Personnel", id, {}, "");
  return json({ ok: true });
}
