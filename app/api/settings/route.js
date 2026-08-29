import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { ROLES } from "@/lib/constants";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  await connectDB();
  return json({ settings: await getSettings() });
}

export async function PUT(req) {
  const { session, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  const settings = await saveSettings(body);
  await addAudit(session, "settings_update", "Setting", "app", settings, clientIp(req));
  return json({ settings });
}
