import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { normalizeMobile } from "@/lib/usersync";
import { ROLES } from "@/lib/constants";
import User from "@/models/User";
import Applicant from "@/models/Applicant";
import { applyUserRegion } from "@/lib/regions";

export async function PUT(req, { params }) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await readJson(req);
  await applyUserRegion(body);
  const user = await User.findById(id);
  if (!user) return fail("یافت نشد", 404);
  if (body.mobile) {
    const mobile = normalizeMobile(body.mobile);
    const taken = await User.findOne({ mobile, _id: { $ne: user._id } });
    if (taken) return fail("شماره همراه تکراری است");
    user.mobile = mobile;
    await Applicant.updateMany(
      { personnelCode: user.personnelCode },
      { $set: { mobile } }
    );
  }
  if (body.personnelCode && body.personnelCode !== user.personnelCode) {
    const taken = await User.findOne({
      personnelCode: body.personnelCode,
      _id: { $ne: user._id },
    });
    if (taken) return fail("کد پرسنلی تکراری است");
    user.personnelCode = body.personnelCode;
  }
  if (body.fullName != null) user.fullName = body.fullName;
  if (body.roles) user.roles = body.roles;
  if (body.districtCode != null) user.districtCode = body.districtCode;
  if (body.provinceCode != null) user.provinceCode = body.provinceCode;
  if (body.isActive != null) user.isActive = body.isActive;
  if (body.isLocked != null) user.isLocked = body.isLocked;
  if (body.password) user.passwordHash = await bcrypt.hash(body.password, 10);
  await user.save();
  await addAudit(session, "user_update", "User", user._id, body, clientIp(req));
  return json({ item: { ...user.toObject(), passwordHash: undefined } });
}

export async function DELETE(_req, { params }) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  await User.findByIdAndDelete(id);
  await addAudit(session, "user_delete", "User", id, {}, "");
  return json({ ok: true });
}
