import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Region from "@/models/Region";
import { clearRegionCache } from "@/lib/regions";
import { findPaged, parsePaging } from "@/lib/pagination";

export async function GET(req) {
  const { error } = await requireUser();
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const paging = parsePaging(sp);
  const filter = q
    ? {
        $or: [
          { districtCode: new RegExp(q, "i") },
          { districtName: new RegExp(q, "i") },
          { provinceCode: new RegExp(q, "i") },
        ],
      }
    : {};
  return json(await findPaged(Region, filter, { districtCode: 1 }, paging));
}

export async function POST(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  if (!body.districtCode || !body.districtName || !body.provinceCode) {
    return fail("کد استان، کد منطقه و نام منطقه الزامی است");
  }
  if (await Region.findOne({ districtCode: body.districtCode })) {
    return fail("کد منطقه تکراری است");
  }
  const item = await Region.create(body);
  clearRegionCache();
  return json({ item });
}
