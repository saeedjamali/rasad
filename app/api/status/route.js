import { connectDB } from "@/lib/db";
import { json } from "@/lib/http";
import { publicStatus } from "@/lib/settings";

export async function GET() {
  await connectDB();
  return json(await publicStatus());
}
