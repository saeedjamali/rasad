import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { addRequestLog } from "@/lib/logging";
import { ROLES, STATUSES } from "@/lib/constants";
import Request from "@/models/Request";

export async function POST(_req, { params }) {
  const { user, role, error } = await requireUser([ROLES.province_transfer]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Request.findById(id);
  if (!item) return fail("یافت نشد", 404);
  if (item.status === STATUSES.WAITING_PROVINCE_REVIEW) {
    const from = item.status;
    item.status = STATUSES.IN_REVIEW_PROVINCE;
    item.openedBy = user._id;
    item.openedAt = new Date();
    await item.save();
    await addRequestLog({
      request: item,
      action: "enter",
      fromStatus: from,
      toStatus: item.status,
      user,
      role,
      comment: "ورود کارشناس استان به درخواست",
      visibleToUser: true,
    });
  }
  return json({ item });
}
