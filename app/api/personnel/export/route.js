import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonToBuffer, personnelToRows } from "@/lib/excel";
import { ROLES } from "@/lib/constants";
import Personnel from "@/models/Personnel";
import { decoratePersonnel } from "@/lib/regions";

export async function GET() {
  const { error } = await requireUser([ROLES.province_transfer, ROLES.admin]);
  if (error) return error;
  await connectDB();
  const list = await decoratePersonnel(await Personnel.find().lean());
  const buf = jsonToBuffer(personnelToRows(list), "personnel");
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=personnel.xlsx",
    },
  });
}
