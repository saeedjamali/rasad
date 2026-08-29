import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { normalizeMobile } from "@/lib/usersync";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import User from "@/models/User";
import { applyUserRegion, decorateUsers, loadRegionMap } from "@/lib/regions";
import { findPaged, parsePaging } from "@/lib/pagination";

export async function GET(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim();
  const role = sp.get("role") || "";
  const paging = parsePaging(sp);
  const and = [];
  if (role && Object.values(ROLES).includes(role)) {
    and.push({ roles: role });
  }
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const map = await loadRegionMap();
    const codes = [];
    for (const r of map.values()) {
      if (String(r.districtName).includes(q) || String(r.districtCode).includes(q)) {
        codes.push(r.districtCode);
      }
    }
    const roleHits = Object.entries(ROLE_LABELS)
      .filter(([k, v]) => k.includes(q) || v.includes(q))
      .map(([k]) => k);
    and.push({
      $or: [
        { mobile: new RegExp(safe, "i") },
        { personnelCode: new RegExp(safe, "i") },
        { fullName: new RegExp(safe, "i") },
        { districtCode: new RegExp(safe, "i") },
        ...(codes.length ? [{ districtCode: { $in: codes } }] : []),
        ...(roleHits.length ? [{ roles: { $in: roleHits } }] : []),
      ],
    });
  }
  const filter = and.length ? { $and: and } : {};
  const result = await findPaged(User, filter, { createdAt: -1 }, paging);
  const mapped = await decorateUsers(result.list.map((u) => ({ ...u, passwordHash: undefined })));
  return json({ ...result, list: mapped });
}

export async function POST(req) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  await applyUserRegion(body);
  const mobile = normalizeMobile(body.mobile);
  if (!mobile || !body.personnelCode) return fail("شماره همراه و کد پرسنلی الزامی است");
  if (await User.findOne({ mobile })) return fail("شماره همراه تکراری است");
  if (await User.findOne({ personnelCode: body.personnelCode })) {
    return fail("کد پرسنلی تکراری است");
  }
  const doc = await User.create({
    mobile,
    personnelCode: body.personnelCode,
    fullName: body.fullName || "",
    roles: body.roles?.length ? body.roles : [ROLES.personnel],
    districtCode: body.districtCode || "",
    provinceCode: body.provinceCode || "17",
    isActive: body.isActive !== false,
    isLocked: !!body.isLocked,
    passwordHash: body.password ? await bcrypt.hash(body.password, 10) : "",
  });
  await addAudit(session, "user_create", "User", doc._id, { mobile }, clientIp(req));
  return json({ item: { ...doc.toObject(), passwordHash: undefined } });
}
