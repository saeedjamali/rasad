import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonToBuffer, usersToRows } from "@/lib/excel";
import { ROLES } from "@/lib/constants";
import User from "@/models/User";
import { decorateUsers } from "@/lib/regions";

export async function GET() {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const list = await decorateUsers(await User.find().lean());
  const buf = jsonToBuffer(usersToRows(list), "users");
  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=users.xlsx",
    },
  });
}
