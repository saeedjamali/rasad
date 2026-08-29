import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "./db";
import User from "@/models/User";
import { MAINTENANCE_MESSAGE, ROLES } from "./constants";
import { systemBlockedFor } from "./settings";

const COOKIE_NAME = "rasad_token";

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "rasad-dev-secret-please-change"
  );

async function cookieShouldBeSecure(req) {
  const explicit = String(process.env.COOKIE_SECURE || "").toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  let forwarded = req?.headers?.get("x-forwarded-proto") || "";
  if (!forwarded) {
    try {
      forwarded = (await headers()).get("x-forwarded-proto") || "";
    } catch {
      forwarded = "";
    }
  }
  const proto = forwarded.split(",")[0].trim().toLowerCase();
  if (proto === "https") return true;
  const urlProto = req?.nextUrl?.protocol?.replace(":", "").toLowerCase();
  return urlProto === "https";
}

async function sessionCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: await cookieShouldBeSecure(req),
  };
}

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
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function attachSessionCookie(response, payload, req) {
  const token = await signToken(payload);
  const options = await sessionCookieOptions(req);
  response.cookies.set(COOKIE_NAME, token, options);
  return response;
}

export async function attachClearSession(response, req) {
  const options = await sessionCookieOptions(req);
  response.cookies.set(COOKIE_NAME, "", { ...options, maxAge: 0 });
  return response;
}

export async function setSessionCookie(payload, req) {
  const token = await signToken(payload);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, await sessionCookieOptions(req));
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
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
