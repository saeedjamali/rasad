import { NextResponse } from "next/server";

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function trackingCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `RASAD-${n}`;
}

export function clientIp(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}
