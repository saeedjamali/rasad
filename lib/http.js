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

function normalizeIp(raw) {
  let ip = String(raw || "")
    .trim()
    .replace(/^\[|\]$/g, "");
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  return ip;
}

function ipRank(ip) {
  if (!ip) return 0;
  if (ip === "::1" || ip === "localhost" || /^127\./.test(ip)) return 1;
  if (/^169\.254\./.test(ip) || /^fe80:/i.test(ip)) return 2;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return 3;
  if (/^(fc|fd)/i.test(ip)) return 3;
  return 4;
}

function collectHeaderIps(headers) {
  if (!headers?.get) return [];
  const names = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-client-ip",
    "x-original-forwarded-for",
    "x-forwarded-for",
    "forwarded",
  ];
  const ips = [];
  for (const name of names) {
    const raw = headers.get(name);
    if (!raw) continue;
    if (name === "forwarded") {
      for (const part of String(raw).split(",")) {
        const m = part.match(/for=\s*"?\[?([^\]";\s]+)/i);
        if (m) {
          const ip = normalizeIp(m[1]);
          if (ip) ips.push(ip);
        }
      }
      continue;
    }
    for (const part of String(raw).split(",")) {
      const ip = normalizeIp(part);
      if (ip) ips.push(ip);
    }
  }
  return ips;
}

export function clientIp(req) {
  const ips = collectHeaderIps(req?.headers);
  if (!ips.length) return "";
  return ips.slice().sort((a, b) => ipRank(b) - ipRank(a))[0] || "";
}

export function publicIpLabel(ip) {
  const value = normalizeIp(ip);
  if (!value || ipRank(value) <= 1) return "";
  return value;
}
