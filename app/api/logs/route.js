import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import AuditLog from "@/models/AuditLog";
import RequestLog from "@/models/RequestLog";
import { findPaged, parsePaging } from "@/lib/pagination";

export async function GET(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "audit";
  const paging = parsePaging(sp);
  const Model = type === "request" ? RequestLog : AuditLog;
  return json(await findPaged(Model, {}, { createdAt: -1 }, paging));
}
