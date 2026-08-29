"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import FilePicker from "@/components/FilePicker";
import Timeline from "@/components/Timeline";
import StatusBadge from "@/components/StatusBadge";
import RegionSelect from "@/components/RegionSelect";
import { REVIEW_RESULT_USER_MESSAGE, STATUSES } from "@/lib/constants";
import PreviousRequestDrawer from "@/components/PreviousRequestDrawer";
import Feedback from "@/components/Feedback";

const emptyForm = {
  title: "",
  categoryId: "",
  subcategoryIds: [],
  proposedDistrictCode: "",
  proposedDistrictName: "",
  description: "",
};

export default function PersonnelRequestPage() {
  const [categories, setCategories] = useState([]);
  const [rq, setRq] = useState(null);
  const [previous, setPrevious] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [allowNewRequestAfterFinal, setAllowNewRequestAfterFinal] = useState(false);

  async function load() {
    const [c, list] = await Promise.all([
      api("/api/categories"),
      api("/api/requests?all=1"),
    ]);
    setCategories(c.list || []);
    const items = list.list || [];
    const open = items.find((r) => r.status !== STATUSES.REVIEW_RESULT);
    const closedItems = items.filter((r) => r.status === STATUSES.REVIEW_RESULT);
    setAllowNewRequestAfterFinal(Boolean(list.allowNewRequestAfterFinal));
    setPrevious(closedItems);
    const current = open || (!list.allowNewRequestAfterFinal ? closedItems[0] : null);
    setRq(current || null);
    if (open) {
      const d = await api(`/api/requests/${open._id}`);
      setLogs(d.logs || []);
      setForm({
        title: open.title || "",
        categoryId: open.categoryId,
        subcategoryIds: open.subcategoryIds || [],
        proposedDistrictCode: open.proposedDistrictCode || "",
        proposedDistrictName: open.proposedDistrictName || "",
        description: open.description || "",
      });
      setFiles(open.attachments || []);
    } else if (current) {
      const d = await api(`/api/requests/${current._id}`);
      setLogs(d.logs || []);
      setForm(emptyForm);
      setFiles([]);
    } else {
      setLogs([]);
      setForm(emptyForm);
      setFiles([]);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      setMsgType("error");
      setMsg(e.message);
    });
  }, []);

  const parents = categories.filter((c) => !c.parentId && c.isActive);
  const selected = parents.find((c) => String(c._id) === String(form.categoryId));
  const children = categories.filter((c) => String(c.parentId) === String(form.categoryId));

  function toggleSub(id, single) {
    setForm((f) => {
      if (single) return { ...f, subcategoryIds: [id] };
      const has = f.subcategoryIds.includes(id);
      return {
        ...f,
        subcategoryIds: has ? f.subcategoryIds.filter((x) => x !== id) : [...f.subcategoryIds, id],
      };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const cat = selected;
    const payload = {
      ...form,
      categoryTitle: cat?.title,
      subcategoryTitles: children.filter((c) => form.subcategoryIds.includes(c._id)).map((c) => c.title),
      proposedDistrictName: form.proposedDistrictName,
      attachments: files,
    };
    try {
      if (rq && rq.status === STATUSES.WAITING_PROVINCE_REVIEW) {
        await api(`/api/requests/${rq._id}`, { method: "PUT", body: payload });
        setMsgType("success");
        setMsg("درخواست ویرایش شد");
      } else if (rq && rq.status === STATUSES.RETURNED_TO_USER) {
        await api(`/api/requests/${rq._id}/action`, {
          method: "POST",
          body: { action: "user_reply", comment: form.description, ...payload },
        });
        setMsgType("success");
        setMsg("پاسخ ارسال شد");
      } else {
        await api("/api/requests", { method: "POST", body: payload });
        setMsgType("success");
        setMsg("درخواست ثبت شد");
      }
      await load();
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  const hasOpen = Boolean(rq && rq.status !== STATUSES.REVIEW_RESULT);
  const canStartNew = allowNewRequestAfterFinal && !hasOpen && previous.length > 0;
  const canEdit =
    !rq ||
    rq.status === STATUSES.WAITING_PROVINCE_REVIEW ||
    rq.status === STATUSES.RETURNED_TO_USER ||
    canStartNew;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">درخواست رسیدگی</h1>
      {rq && (
        <div className="card p-4 space-y-2">
          <div className="flex gap-3 items-center">
            <span>کد پیگیری: {rq.trackingCode}</span>
            <StatusBadge status={rq.status} result={rq.result} forUser />
          </div>
          {rq.title ? <p className="text-sm font-medium">عنوان درخواست: {rq.title}</p> : null}
          {rq.status === STATUSES.REVIEW_RESULT && <p className="text-sm">{REVIEW_RESULT_USER_MESSAGE}</p>}
          {rq.proposedRegionLabel || rq.proposedDistrictName ? (
            <p className="text-sm">مقصد پیشنهادی: {rq.proposedRegionLabel || rq.proposedDistrictName}</p>
          ) : null}
        </div>
      )}

      {canEdit && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          {canStartNew ? <h2 className="font-bold">ثبت درخواست جدید</h2> : null}
          <div>
            <label className="label">دسته‌بندی</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value, subcategoryIds: [], proposedDistrictCode: "" })
              }
              required
            >
              <option value="">انتخاب کنید</option>
              {parents.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            {selected?.description ? (
              <p className="text-xs text-slate-500 mt-1">{selected.description}</p>
            ) : null}
          </div>

          {children.length > 0 && (
            <div>
              <label className="label">زیر‌دسته</label>
              <div className="space-y-1">
                {children.map((c) => (
                  <label key={c._id} className="flex items-center gap-2 text-sm">
                    <input
                      type={selected?.selectionType === "single" ? "radio" : "checkbox"}
                      name="sub"
                      checked={form.subcategoryIds.map(String).includes(String(c._id))}
                      onChange={() => toggleSub(c._id, selected?.selectionType === "single")}
                    />
                    {c.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selected?.showDistricts && (
            <div>
              <label className="label">منطقه مقصد پیشنهادی</label>
              <RegionSelect
                value={form.proposedDistrictCode}
                required
                onChange={(code, region) =>
                  setForm({
                    ...form,
                    proposedDistrictCode: code,
                    proposedDistrictName: region?.districtName || "",
                  })
                }
              />
            </div>
          )}

          <div>
            <label className="label">عنوان درخواست</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
              placeholder="مثلاً اصلاح منطقه مقصد"
              required
            />
          </div>

          <div>
            <label className="label">شرح درخواست</label>
            <textarea
              className="input min-h-28"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <FilePicker files={files} setFiles={setFiles} />
          <button className="btn-primary">
            {rq?.status === STATUSES.RETURNED_TO_USER
              ? "ارسال پاسخ و اصلاح"
              : canStartNew || !rq
                ? "ثبت درخواست"
                : "ذخیره ویرایش"}
          </button>
          <Feedback message={msg} type={msgType} />
        </form>
      )}

      {rq && (hasOpen || !allowNewRequestAfterFinal) && (
        <div>
          <h2 className="font-bold mb-3">{hasOpen && previous.length ? "گردش کار درخواست جاری" : "گردش کار"}</h2>
          <Timeline logs={logs} forUser />
        </div>
      )}
      {allowNewRequestAfterFinal && previous.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-bold">گردش کار درخواست‌های قبلی</h2>
          {previous.map((item) => (
            <PreviousRequestDrawer key={item._id} item={item} />
          ))}
        </div>
      ) : null}
      {msg && !canEdit ? <Feedback message={msg} type={msgType} /> : null}
    </div>
  );
}
