import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "rasad-dev-secret-please-change"
);

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("rasad_token")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (pathname.startsWith("/app") && !valid) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname === "/" && valid) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*"],
};
