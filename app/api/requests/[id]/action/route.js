import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit, addRequestLog } from "@/lib/logging";
import { sendSms } from "@/lib/sms";
import { ROLES, STATUSES, STATUS_USER_LABELS } from "@/lib/constants";
import { districtLogFields } from "@/lib/regions";
import Request from "@/models/Request";
import Region from "@/models/Region";

const PROVINCE_OPEN = [
  STATUSES.IN_REVIEW_PROVINCE,
  STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE,
];

async function notifyIfFinalReview(item, fromStatus) {
  if (fromStatus === STATUSES.REVIEW_RESULT || item.status !== STATUSES.REVIEW_RESULT) return;
  await sendSms(
    item.mobile,
    `سامانه رصد: وضعیت درخواست ${item.trackingCode} به «${STATUS_USER_LABELS.REVIEW_RESULT}» تغییر کرد.`
  );
}

export async function POST(req, { params }) {
  const { user, session, role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await readJson(req);
  const item = await Request.findById(id);
  if (!item) return fail("یافت نشد", 404);
  const action = body.action;
  const from = item.status;
  const comment = body.comment || "";
  const attachments = body.attachments || [];

  if (role === ROLES.personnel) {
    if (action !== "user_reply") return fail("عملیات نامعتبر");
    if (item.personnelCode !== user.personnelCode) return fail("دسترسی مجاز نیست", 403);
    if (item.status !== STATUSES.RETURNED_TO_USER) return fail("در این وضعیت امکان پاسخ نیست");
    if (body.categoryId) {
      item.categoryId = body.categoryId;
      item.categoryTitle = body.categoryTitle || item.categoryTitle;
    }
    if (body.subcategoryIds) item.subcategoryIds = body.subcategoryIds;
    if (body.subcategoryTitles) item.subcategoryTitles = body.subcategoryTitles;
    if (body.proposedDistrictCode) {
      const region = await Region.findOne({ districtCode: body.proposedDistrictCode });
      if (!region) return fail("منطقه نامعتبر است");
      item.proposedDistrictCode = region.districtCode;
      item.proposedDistrictName = region.districtName;
    }
    if (body.title != null) {
      const title = String(body.title || "").trim();
      if (!title) return fail("عنوان درخواست را وارد کنید");
      if (title.length > 120) return fail("عنوان درخواست نباید بیشتر از ۱۲۰ نویسه باشد");
      item.title = title;
    }
    if (body.description) item.description = body.description;
    if (attachments.length) {
      item.attachments = [...(item.attachments || []), ...attachments].slice(-8);
    }
    item.status = STATUSES.WAITING_PROVINCE_REVIEW;
    await item.save();
    await addRequestLog({
      request: item,
      action: "user_reply",
      fromStatus: from,
      toStatus: item.status,
      user,
      role,
      comment,
      attachments,
      visibleToUser: true,
    });
    return json({ item });
  }

  if (role === ROLES.province_transfer) {
    if (![...PROVINCE_OPEN, STATUSES.WAITING_PROVINCE_REVIEW].includes(item.status)) {
      if (item.status !== STATUSES.IN_REVIEW_PROVINCE && item.status !== STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE) {
        return fail("در این وضعیت امکان اقدام استان نیست");
      }
    }
    if (item.status === STATUSES.WAITING_PROVINCE_REVIEW) {
      item.status = STATUSES.IN_REVIEW_PROVINCE;
      item.openedBy = user._id;
      item.openedAt = new Date();
    }

    if (action === "comment") {
      await item.save();
      await addRequestLog({
        request: item,
        action: "comment",
        fromStatus: from,
        toStatus: item.status,
        user,
        role,
        comment,
        attachments,
        visibleToUser: !!body.visibleToUser,
        visibleToProvinceOnly: !body.visibleToUser,
      });
      return json({ item });
    }

    if (action === "approve") {
      if (!comment.trim()) return fail("برای تایید درخواست ثبت توضیحات الزامی است");
      item.status = STATUSES.REVIEW_RESULT;
      item.result = "approved";
      item.closedAt = new Date();
    } else if (action === "reject") {
      if (!comment.trim()) return fail("برای رد درخواست ثبت توضیحات الزامی است");
      item.status = STATUSES.REVIEW_RESULT;
      item.result = "rejected";
      item.closedAt = new Date();
    } else if (action === "return") {
      if (!comment.trim()) return fail("برای بازگشت به کاربر ثبت توضیحات الزامی است");
      item.status = STATUSES.RETURNED_TO_USER;
    } else if (action === "inquiry_planning") {
      if (!comment.trim()) return fail("برای استعلام از طرح و برنامه استان ثبت توضیحات الزامی است");
      item.status = STATUSES.INQUIRY_PLANNING;
    } else if (action === "inquiry_district") {
      if (!body.districtCode) return fail("منطقه را انتخاب کنید");
      const region = await Region.findOne({ districtCode: body.districtCode });
      if (!region) return fail("منطقه یافت نشد");
      item.status = STATUSES.INQUIRY_DISTRICT;
      item.assignedDistrictCode = region.districtCode;
      item.assignedDistrictName = region.districtName;
      item.districtInquiryNote = String(body.districtInquiryNote || "").trim();
    } else {
      return fail("عملیات نامعتبر");
    }

    await item.save();
    await addRequestLog({
      request: item,
      action,
      fromStatus: from,
      toStatus: item.status,
      user,
      role,
      comment,
      attachments,
      visibleToUser: true,
      extra: {
        ...(action === "inquiry_district"
          ? districtLogFields({
              districtCode: item.assignedDistrictCode,
              districtName: item.assignedDistrictName,
            })
          : item.assignedDistrictCode
            ? {
                districtCode: item.assignedDistrictCode,
                districtName: item.assignedDistrictName,
              }
            : {}),
        ...(action === "approve" || action === "reject" ? { result: item.result } : {}),
      },
    });
    if (action === "inquiry_district" && item.districtInquiryNote) {
      await addRequestLog({
        request: item,
        action: "inquiry_district_note",
        fromStatus: from,
        toStatus: item.status,
        user,
        role,
        comment: item.districtInquiryNote,
        visibleToUser: false,
        visibleToDistrictOnly: true,
        extra: districtLogFields({
          districtCode: item.assignedDistrictCode,
          districtName: item.assignedDistrictName,
        }),
      });
    }
    await addAudit(session, `request_${action}`, "Request", item._id, {}, clientIp(req));
    await notifyIfFinalReview(item, from);
    return json({ item });
  }

  if (role === ROLES.district_transfer) {
    if (item.assignedDistrictCode !== user.districtCode) return fail("دسترسی مجاز نیست", 403);
    if (item.status !== STATUSES.INQUIRY_DISTRICT) return fail("این درخواست در کارتابل منطقه نیست");

    if (action === "district_user_note") {
      await addRequestLog({
        request: item,
        action,
        fromStatus: item.status,
        toStatus: item.status,
        user,
        role,
        comment,
        attachments,
        visibleToUser: true,
      });
      return json({ item });
    }
    if (action === "district_province_note") {
      await addRequestLog({
        request: item,
        action,
        fromStatus: item.status,
        toStatus: item.status,
        user,
        role,
        comment,
        attachments,
        visibleToUser: false,
        visibleToProvinceOnly: true,
      });
      return json({ item });
    }
    if (action === "district_send") {
      item.status = STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE;
      item.result = body.opinion === "reject" ? "rejected" : "approved";
      await item.save();
      await addRequestLog({
        request: item,
        action,
        fromStatus: from,
        toStatus: item.status,
        user,
        role,
        comment,
        attachments,
        visibleToUser: true,
        extra: { opinion: body.opinion },
      });
      if (body.provinceComment) {
        await addRequestLog({
          request: item,
          action: "district_province_note",
          fromStatus: item.status,
          toStatus: item.status,
          user,
          role,
          comment: body.provinceComment,
          visibleToUser: false,
          visibleToProvinceOnly: true,
        });
      }
      return json({ item });
    }
    return fail("عملیات نامعتبر");
  }

  if (role === ROLES.province_planning) {
    if (item.status !== STATUSES.INQUIRY_PLANNING) return fail("این درخواست در کارتابل طرح و برنامه نیست");
    if (action !== "planning_opinion") return fail("عملیات نامعتبر");
    item.status = STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE;
    item.result = body.opinion === "disagree" ? "disagree" : "agree";
    await item.save();
    await addRequestLog({
      request: item,
      action,
      fromStatus: from,
      toStatus: item.status,
      user,
      role,
      comment,
      attachments,
      visibleToUser: true,
      extra: { opinion: body.opinion },
    });
    return json({ item });
  }

  if (role === ROLES.admin) {
    if (action !== "admin_set_status") return fail("عملیات نامعتبر");
    const next = body.status;
    if (!Object.values(STATUSES).includes(next)) return fail("وضعیت نامعتبر است");
    if (next === STATUSES.INQUIRY_DISTRICT) {
      const code = body.districtCode || item.assignedDistrictCode;
      if (!code) return fail("منطقه را انتخاب کنید");
      const region = await Region.findOne({ districtCode: code });
      if (!region) return fail("منطقه یافت نشد");
      item.assignedDistrictCode = region.districtCode;
      item.assignedDistrictName = region.districtName;
    }
    if (next === STATUSES.REVIEW_RESULT) {
      const result = body.result === "rejected" ? "rejected" : body.result === "approved" ? "approved" : "";
      if (!result) return fail("نتیجه بررسی را انتخاب کنید");
      item.result = result;
      item.closedAt = new Date();
    } else {
      item.closedAt = null;
      if (next !== STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE) item.result = "";
    }
    if (next === STATUSES.IN_REVIEW_PROVINCE && !item.openedAt) {
      item.openedBy = user._id;
      item.openedAt = new Date();
    }
    item.status = next;
    await item.save();
    await addRequestLog({
      request: item,
      action: "admin_set_status",
      fromStatus: from,
      toStatus: item.status,
      user,
      role,
      comment: comment || "تغییر وضعیت توسط مدیر سیستم",
      attachments,
      visibleToUser: true,
      extra: {
        result: item.result,
        ...(item.assignedDistrictCode
          ? districtLogFields({
              districtCode: item.assignedDistrictCode,
              districtName: item.assignedDistrictName,
            })
          : {}),
      },
    });
    await addAudit(session, "request_admin_set_status", "Request", item._id, { from, to: next }, clientIp(req));
    await notifyIfFinalReview(item, from);
    return json({ item });
  }

  return fail("دسترسی مجاز نیست", 403);
}
