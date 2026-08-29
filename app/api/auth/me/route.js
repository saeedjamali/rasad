import { connectDB } from "@/lib/db";
import { json } from "@/lib/http";
import { getSession, publicUser } from "@/lib/auth";
import User from "@/models/User";
import { findRegion, findRegionByName, loadRegionMap, regionLabel } from "@/lib/regions";

export async function GET() {
  await connectDB();
  const session = await getSession();
  if (!session?.userId) return json({ user: null });
  const user = await User.findById(session.userId);
  if (!user) return json({ user: null });
  const map = await loadRegionMap();
  const region = findRegion(map, user.districtCode) || findRegionByName(map, user.districtCode);
  return json({
    user: {
      ...publicUser(user, session),
      districtName: region?.districtName || "",
      districtLabel: region ? regionLabel(region) : user.districtCode || "",
      hasPassword: Boolean(user.passwordHash),
    },
  });
}
