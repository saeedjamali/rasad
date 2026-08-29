import { attachClearSession } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(req) {
  return attachClearSession(json({ ok: true }), req);
}
