import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { visitSummary } from "@/lib/sessions";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  await connectDB();
  return json(await visitSummary());
}
