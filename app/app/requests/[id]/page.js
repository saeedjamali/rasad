"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, roleName } from "@/lib/client";
import Timeline from "@/components/Timeline";
import StatusBadge from "@/components/StatusBadge";
import FilePicker from "@/components/FilePicker";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import RegionSelect, { applicantRegionValue } from "@/components/RegionSelect";
import { APPLICANT_FIELDS, PERSONNEL_VISIBLE_FIELDS, RESULT_LABELS, ROLES, STATUSES, STATUS_LABELS, applicantFullName } from "@/lib/constants";
import Feedback, { ActionRow } from "@/components/Feedback";

const labels = Object.fromEntries(APPLICANT_FIELDS);

const ACTION_OK = {
  approve: "درخواست تایید شد",
  reject: "درخواست رد شد",
  return: "درخواست به کاربر بازگشت داده شد",
  inquiry_planning: "استعلام از طرح و برنامه استان ارسال شد",
  inquiry_district: "استعلام به کارشناس منطقه ارسال شد",
  comment: "توضیحات ثبت شد",
  district_user_note: "پاسخ برای کاربر ثبت شد",
  district_province_note: "توضیح برای استان ثبت شد",
  district_send: "پاسخ به استان ارسال شد",
  planning_opinion: "نظر طرح و برنامه ثبت شد",
  admin_set_status: "وضعیت درخواست ذخیره شد",
};

export default function RequestDetailPage() {
  const { id } = useParams();
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [comment, setComment] = useState("");
  const [provinceComment, setProvinceComment] = useState("");
  const [districtInquiryNote, setDistrictInquiryNote] = useState("");
  const [files, setFiles] = useState([]);
  const [districtCode, setDistrictCode] = useState("");
  const [showDistricts, setShowDistricts] = useState(false);
  const [adminStatus, setAdminStatus] = useState("");
  const [adminResult, setAdminResult] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [busy, setBusy] = useState(false);
  const commentRef = useRef(null);

  async function load() {
    const [u, d] = await Promise.all([api("/api/auth/me"), api(`/api/requests/${id}`)]);
    setMe(u.user);
    setData(d);
    setAdminStatus(d.item?.status || "");
    setAdminResult(d.item?.result === "rejected" || d.item?.result === "approved" ? d.item.result : "");
    setDistrictCode(d.item?.assignedDistrictCode || "");
    if (u.user?.activeRole === ROLES.province_transfer && d.item?.status === STATUSES.WAITING_PROVINCE_REVIEW) {
      await api(`/api/requests/${id}/enter`, { method: "POST" });
      setData(await api(`/api/requests/${id}`));
    }
  }

  useEffect(() => {
    if (id) load().catch((e) => setMsg(e.message));
  }, [id]);

  async function openDistrictModal() {
    setShowDistricts(true);
  }

  function showMsg(text, type = "error") {
    setMsg(text);
    setMsgType(type);
  }

  function requireComment(message) {
    if (comment.trim()) return true;
    showMsg(message, "error");
    commentRef.current?.focus();
    return false;
  }

  async function act(action, extra = {}) {
    showMsg("");
    setBusy(true);
    try {
      await api(`/api/requests/${id}/action`, {
        method: "POST",
        body: { action, comment, attachments: files, ...extra },
      });
      setComment("");
      setFiles([]);
      setDistrictInquiryNote("");
      setShowDistricts(false);
      await load();
      showMsg(ACTION_OK[action] || "عملیات با موفقیت انجام شد", "success");
    } catch (e) {
      showMsg(e.message || "خطا در انجام عملیات", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p>در حال بارگذاری...</p>;
  const { item, applicant, logs, tracker } = data;
  const role = me?.activeRole;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{item.title || `درخواست ${item.trackingCode}`}</h1>
        <StatusBadge status={item.status} result={item.result} />
      </div>
      {item.title ? <p className="text-sm text-slate-500">کد پیگیری: {item.trackingCode}</p> : null}
      <div className="card p-4 text-sm">
        پیگیری‌کننده فعلی: <b>{tracker}</b>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-bold">مشخصات درخواست</h2>
          {item.title ? <p>عنوان درخواست: {item.title}</p> : null}
          <p>کد پرسنلی: {item.personnelCode}</p>
          {applicantFullName(applicant) ? <p>نام: {applicantFullName(applicant)}</p> : null}
          <p>موبایل: {item.mobile}</p>
          <p>دسته‌بندی: {item.categoryTitle}</p>
          {item.subcategoryTitles?.length ? <p>زیر‌دسته: {item.subcategoryTitles.join("، ")}</p> : null}
          {item.proposedRegionLabel || item.proposedDistrictCode ? (
            <p>مقصد پیشنهادی: {item.proposedRegionLabel || item.proposedDistrictName || item.proposedDistrictCode}</p>
          ) : null}
          {item.assignedRegionLabel || item.assignedDistrictCode ? (
            <p>منطقه ارجاع‌شده: {item.assignedRegionLabel || item.assignedDistrictName || item.assignedDistrictCode}</p>
          ) : null}
          <p className="whitespace-pre-wrap">شرح درخواست: {item.description}</p>
          {item.attachments?.length ? <AttachmentPreview files={item.attachments} /> : null}
        </div>
        <div className="card p-4">
          <h2 className="font-bold mb-2">اطلاعات متقاضی</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {applicant &&
              PERSONNEL_VISIBLE_FIELDS.map((k) => (
                <div key={k}>
                  <span className="text-slate-500">{labels[k]}: </span>
                  {applicantRegionValue(applicant, k)}
                </div>
              ))}
          </div>
        </div>
      </div>

      {role === ROLES.province_transfer && item.status !== STATUSES.REVIEW_RESULT && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold">اقدام کارشناس انتقالات استان</h2>
          <textarea
            ref={commentRef}
            className={`input min-h-24 ${msg && msgType === "error" && msg.includes("توضیحات الزامی") ? "border-red-500" : ""}`}
            placeholder="توضیحات (برای تایید، رد، بازگشت به کاربر و استعلام از طرح و برنامه الزامی است)"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (msg.includes("توضیحات الزامی")) showMsg("");
            }}
          />
          <FilePicker files={files} setFiles={setFiles} />
          <ActionRow message={showDistricts ? "" : msg} type={msgType}>
            <button
              className="btn-success"
              disabled={busy}
              onClick={() => {
                if (!requireComment("برای تایید درخواست ثبت توضیحات الزامی است")) return;
                act("approve");
              }}
            >
              تایید درخواست
            </button>
            <button
              className="btn-danger"
              disabled={busy}
              onClick={() => {
                if (!requireComment("برای رد درخواست ثبت توضیحات الزامی است")) return;
                act("reject");
              }}
            >
              رد درخواست
            </button>
            <button
              className="btn-outline"
              disabled={busy}
              onClick={() => {
                if (!requireComment("برای بازگشت به کاربر ثبت توضیحات الزامی است")) return;
                act("return");
              }}
            >
              بازگشت به کاربر
            </button>
            <button
              className="btn-outline"
              disabled={busy}
              onClick={() => {
                if (!requireComment("برای استعلام از طرح و برنامه استان ثبت توضیحات الزامی است")) return;
                act("inquiry_planning");
              }}
            >
              استعلام از طرح و برنامه استان
            </button>
            <button className="btn-gold" disabled={busy} onClick={openDistrictModal}>
              استعلام از منطقه
            </button>
            <button className="btn-outline" disabled={busy} onClick={() => act("comment", { visibleToUser: false })}>
              ثبت توضیحات داخلی
            </button>
          </ActionRow>
          {showDistricts && (
            <div className="border rounded-lg p-3 space-y-2">
              <label className="label">انتخاب منطقه از جدول مناطق</label>
              <RegionSelect value={districtCode} onChange={(code) => setDistrictCode(code)} />
              <label className="label">شرح درخواست برای کارشناس منطقه</label>
              <textarea
                className="input min-h-24"
                placeholder="این متن فقط برای کارشناس انتقالات منطقه قابل مشاهده است"
                value={districtInquiryNote}
                onChange={(e) => setDistrictInquiryNote(e.target.value)}
              />
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => {
                  if (!districtCode) {
                    showMsg("منطقه را انتخاب کنید", "error");
                    return;
                  }
                  act("inquiry_district", { districtCode, districtInquiryNote });
                }}
              >
                ارسال به کارشناس منطقه
              </button>
              <Feedback message={msg} type={msgType} />
            </div>
          )}
        </div>
      )}

      {role === ROLES.district_transfer && item.districtInquiryNote ? (
        <div className="card p-4 space-y-2 border-[#c9a227] bg-amber-50">
          <h2 className="font-bold">شرح درخواست استان (فقط برای کارشناس منطقه)</h2>
          <p className="text-sm whitespace-pre-wrap">{item.districtInquiryNote}</p>
        </div>
      ) : null}

      {role === ROLES.district_transfer && item.status === STATUSES.INQUIRY_DISTRICT && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold">اقدام کارشناس انتقالات منطقه</h2>
          <textarea className="input min-h-20" placeholder="پاسخ قابل مشاهده برای کاربر" value={comment} onChange={(e) => setComment(e.target.value)} />
          <textarea
            className="input min-h-20"
            placeholder="توضیحات فقط برای کارشناس استان"
            value={provinceComment}
            onChange={(e) => setProvinceComment(e.target.value)}
          />
          <FilePicker files={files} setFiles={setFiles} />
          <ActionRow message={msg} type={msgType}>
            <button className="btn-outline" disabled={busy} onClick={() => act("district_user_note")}>
              ثبت پاسخ برای کاربر
            </button>
            <button className="btn-outline" disabled={busy} onClick={() => act("district_province_note")}>
              ثبت توضیح برای استان
            </button>
            <button className="btn-success" disabled={busy} onClick={() => act("district_send", { opinion: "approve", provinceComment })}>
              تایید و ارسال به استان
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => act("district_send", { opinion: "reject", provinceComment })}>
              رد و ارسال به استان
            </button>
          </ActionRow>
        </div>
      )}

      {role === ROLES.province_planning && item.status === STATUSES.INQUIRY_PLANNING && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold">اعلام نظر طرح و برنامه استان</h2>
          <textarea className="input min-h-24" value={comment} onChange={(e) => setComment(e.target.value)} />
          <FilePicker files={files} setFiles={setFiles} />
          <ActionRow message={msg} type={msgType}>
            <button className="btn-success" disabled={busy} onClick={() => act("planning_opinion", { opinion: "agree" })}>
              موافقت
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => act("planning_opinion", { opinion: "disagree" })}>
              مخالفت
            </button>
          </ActionRow>
        </div>
      )}

      {role === ROLES.admin && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold">ویرایش وضعیت درخواست</h2>
          <label className="label">وضعیت</label>
          <select className="input" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
            {Object.values(STATUSES).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
          {adminStatus === STATUSES.REVIEW_RESULT ? (
            <>
              <label className="label">نتیجه بررسی</label>
              <select className="input" value={adminResult} onChange={(e) => setAdminResult(e.target.value)}>
                <option value="">انتخاب کنید</option>
                <option value="approved">{RESULT_LABELS.approved}</option>
                <option value="rejected">{RESULT_LABELS.rejected}</option>
              </select>
            </>
          ) : null}
          {adminStatus === STATUSES.INQUIRY_DISTRICT ? (
            <>
              <label className="label">منطقه ارجاع</label>
              <RegionSelect value={districtCode} onChange={(code) => setDistrictCode(code)} />
            </>
          ) : null}
          <textarea
            className="input min-h-20"
            placeholder="توضیحات تغییر وضعیت (اختیاری)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <ActionRow message={msg} type={msgType}>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => {
                if (adminStatus === STATUSES.REVIEW_RESULT && !adminResult) {
                  showMsg("نتیجه بررسی را انتخاب کنید", "error");
                  return;
                }
                if (adminStatus === STATUSES.INQUIRY_DISTRICT && !districtCode) {
                  showMsg("منطقه را انتخاب کنید", "error");
                  return;
                }
                act("admin_set_status", { status: adminStatus, result: adminResult, districtCode });
              }}
            >
              ذخیره وضعیت
            </button>
          </ActionRow>
        </div>
      )}

      {["province_transfer", "admin", "province_planning", "district_transfer"].includes(role) && (
        <div>
          <h2 className="font-bold mb-2">گردش فرآیند (کاربر پاسخگو، توضیحات، تاریخ و ساعت)</h2>
          <Timeline
            logs={logs}
            showExactDecision={role === ROLES.province_transfer || role === ROLES.admin}
          />
        </div>
      )}
      {["hr_manager", "director_general"].includes(role) && (
        <div>
          <h2 className="font-bold mb-2">گردش کار</h2>
          <Timeline logs={logs.filter((l) => l.visibleToUser)} />
        </div>
      )}
      <p className="text-xs text-slate-400">نقش شما: {roleName(role)}</p>
    </div>
  );
}
