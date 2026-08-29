import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "./db";
import User from "@/models/User";
import { MAINTENANCE_MESSAGE, ROLES } from "./constants";
import { systemBlockedFor } from "./settings";

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "rasad-dev-secret-please-change"
  );

export function toSessionPayload(user, activeRole) {
  const roles = Array.from(user.roles || []);
  return {
    userId: String(user._id),
    mobile: String(user.mobile),
    personnelCode: String(user.personnelCode),
    roles,
    activeRole: activeRole ?? (roles.length === 1 ? roles[0] : null),
    districtCode: String(user.districtCode || ""),
    provinceCode: String(user.provinceCode || ""),
  };
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret());
  return payload;
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get("rasad_token")?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload) {
  const token = await signToken(payload);
  const jar = await cookies();
  jar.set("rasad_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete("rasad_token");
}

export async function requireUser(allowedRoles) {
  await connectDB();
  const session = await getSession();
  if (!session?.userId) {
    return {
      error: NextResponse.json({ message: "نشست نامعتبر است" }, { status: 401 }),
    };
  }
  const user = await User.findById(session.userId);
  if (!user || !user.isActive || user.isLocked) {
    return {
      error: NextResponse.json(
        { message: user?.isLocked ? "حساب کاربری قفل شده است" : "کاربر غیرفعال است" },
        { status: 401 }
      ),
    };
  }
  const role = session.activeRole;
  const isAdmin = user.roles.includes(ROLES.admin) || role === ROLES.admin;
  if (await systemBlockedFor(user)) {
    return {
      error: NextResponse.json(
        { message: MAINTENANCE_MESSAGE, maintenance: true },
        { status: 503 }
      ),
    };
  }
  if (allowedRoles?.length && !isAdmin && !allowedRoles.includes(role)) {
    return {
      error: NextResponse.json({ message: "دسترسی مجاز نیست" }, { status: 403 }),
    };
  }
  return { user, session, role, isAdmin };
}

export function publicUser(user, session) {
  return {
    id: String(user._id),
    mobile: user.mobile,
    personnelCode: user.personnelCode,
    roles: user.roles,
    activeRole: session?.activeRole || user.roles[0],
    districtCode: user.districtCode || "",
    provinceCode: user.provinceCode || "",
    fullName: user.fullName || "",
  };
}
