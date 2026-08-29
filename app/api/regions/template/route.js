import { requireUser } from "@/lib/auth";
import { jsonToBuffer } from "@/lib/excel";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const { error } = await requireUser([ROLES.admin, ROLES.province_transfer]);
  if (error) return error;
  const buf = jsonToBuffer(
    [
      { "کد استان": "17", "کد منطقه": "1701", "نام منطقه": "مشهد ناحیه یک" },
      { "کد استان": "17", "کد منطقه": "1715", "نام منطقه": "نیشابور" },
    ],
    "regions"
  );
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=regions-template.xlsx",
    },
  });
}
