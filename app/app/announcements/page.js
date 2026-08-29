"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { ROLE_LABELS } from "@/lib/constants";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";
import Feedback, { ActionRow } from "@/components/Feedback";
import FilePicker from "@/components/FilePicker";
import AnnouncementDates from "@/components/AnnouncementDates";
import AnnouncementMedia from "@/components/AnnouncementMedia";
import { todayInputDate, toInputDate } from "@/lib/dates";

function emptyForm() {
  return {
    title: "",
    body: "",
    isActive: true,
    isPublic: false,
    roles: [],
    imageUrl: "",
    imageName: "",
    publishedAt: todayInputDate(),
    expiresAt: "",
    order: "",
  };
}

function toForm(n) {
  return {
    title: n.title || "",
    body: n.body || "",
    isActive: n.isActive !== false,
    isPublic: Boolean(n.isPublic),
    roles: Array.isArray(n.roles) ? n.roles : [],
    imageUrl: n.imageUrl || "",
    imageName: n.imageName || "",
    publishedAt: toInputDate(n.publishedAt || n.createdAt) || todayInputDate(),
    expiresAt: toInputDate(n.expiresAt),
    order: n.order || "",
  };
}

function roleText(roles) {
  if (!roles?.length) return "همه نقش‌ها";
  return roles.map((r) => ROLE_LABELS[r] || r).join("، ");
}

function dateStatus(n) {
  const now = Date.now();
  const published = n.publishedAt ? new Date(n.publishedAt).getTime() : 0;
  const expires = n.expiresAt ? new Date(n.expiresAt).getTime() : null;
  if (published > now) return { label: "زمان‌بندی‌شده", className: "bg-amber-100 text-amber-800" };
  if (expires != null && expires < now) return { label: "منقضی", className: "bg-red-100 text-red-800" };
  return null;
}

export default function AnnouncementsPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [rowMsg, setRowMsg] = useState(null);
  const [moving, setMoving] = useState(null);
  const formRef = useRef(null);

  async function load(nextPage = page, nextLimit = limit) {
    const d = await api(`/api/announcements/manage?page=${nextPage}&limit=${nextLimit}`);
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }
  useEffect(() => {
    load(1);
  }, []);

  function toggleRole(role) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((x) => x !== role) : [...f.roles, role],
    }));
  }

  function startEdit(n) {
    setEditing(n._id);
    setForm(toForm(n));
    setMsg("");
    setRowMsg(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm());
    setMsg("");
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");
    const isEdit = Boolean(editing);
    try {
      if (isEdit) {
        await api("/api/announcements/manage", { method: "PUT", body: { ...form, id: editing } });
      } else {
        await api("/api/announcements", { method: "POST", body: form });
      }
      setForm(emptyForm());
      setEditing(null);
      await load(isEdit ? page : 1);
      setMsgType("success");
      setMsg(isEdit ? "اطلاعیه ویرایش شد" : "اطلاعیه ثبت شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  async function move(index, dir) {
    const globalIndex = (page - 1) * limit + index;
    const nextIndex = globalIndex + dir;
    if (nextIndex < 0 || nextIndex >= total) return;
    setMoving(list[index]._id);
    setRowMsg(null);
    try {
      const all = await api("/api/announcements/manage?all=1");
      const ids = (all.list || []).map((n) => n._id);
      if (nextIndex >= ids.length) return;
      [ids[globalIndex], ids[nextIndex]] = [ids[nextIndex], ids[globalIndex]];
      await api("/api/announcements/manage", { method: "PUT", body: { reorder: ids } });
      await load(page, limit);
      setMsgType("success");
      setMsg("ترتیب نمایش به‌روز شد");
    } catch (err) {
      setRowMsg({ id: list[index]._id, text: err.message, type: "error" });
    } finally {
      setMoving(null);
    }
  }

  const imageFiles = form.imageUrl ? [{ url: form.imageUrl, name: form.imageName || "پیوست" }] : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">اطلاعیه‌ها</h1>
      <form ref={formRef} onSubmit={save} className="card p-4 space-y-3">
        <h2 className="font-bold text-sm">{editing ? "ویرایش اطلاعیه" : "ثبت اطلاعیه جدید"}</h2>
        <input
          className="input"
          placeholder="عنوان"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className="input min-h-28"
          placeholder="متن"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="label">تاریخ ثبت</div>
            <input
              type="date"
              className="input"
              dir="ltr"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <div className="label">تاریخ اعتبار (اختیاری)</div>
            <input
              type="date"
              className="input"
              dir="ltr"
              value={form.expiresAt}
              min={form.publishedAt || undefined}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </label>
          <label className="block">
            <div className="label">اولویت نمایش</div>
            <input
              type="number"
              min={1}
              className="input"
              dir="ltr"
              placeholder="خالی = انتها"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">عدد کوچک‌تر بالاتر دیده می‌شود.</p>
          </label>
        </div>
        <div>
          <div className="label">مخاطب اطلاعیه (نقش‌ها)</div>
          <p className="text-xs text-slate-500 mb-2">اگر هیچ نقشی انتخاب نشود، اطلاعیه برای همه نمایش داده می‌شود.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1">
                <input type="checkbox" checked={form.roles.includes(k)} onChange={() => toggleRole(k)} />
                {v}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          فعال
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          نمایش در صفحه اصلی (ورود)
        </label>
        <div>
          <div className="label mb-2">پیوست تصویر یا PDF (اختیاری)</div>
          <FilePicker
            files={imageFiles}
            setFiles={(next) => {
              const first = next[0];
              setForm((f) => ({
                ...f,
                imageUrl: first?.url || "",
                imageName: first?.name || "",
              }));
            }}
            max={1}
            accept="image/*,application/pdf"
            publicUpload
          />
        </div>
        <ActionRow message={msg} type={msgType}>
          {editing ? (
            <button type="button" className="btn-outline" onClick={cancelEdit}>
              انصراف
            </button>
          ) : null}
          <button className="btn-primary">{editing ? "ذخیره تغییرات" : "ثبت اطلاعیه"}</button>
        </ActionRow>
      </form>
      {list.map((n, i) => {
        const status = dateStatus(n);
        const globalIndex = (page - 1) * limit + i;
        return (
          <div
            key={n._id}
            className={`card p-4 flex justify-between gap-3 ${editing === n._id ? "ring-2 ring-[#c9a227]" : ""}`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-0.5">اولویت {n.order || globalIndex + 1}</span>
                <b>{n.title}</b>
                {n.isPublic ? (
                  <span className="rounded-full bg-sky-100 text-sky-800 text-xs px-2 py-0.5">صفحه اصلی</span>
                ) : null}
                {n.isActive === false ? (
                  <span className="rounded-full bg-slate-100 text-slate-600 text-xs px-2 py-0.5">غیرفعال</span>
                ) : null}
                {status ? (
                  <span className={`rounded-full text-xs px-2 py-0.5 ${status.className}`}>{status.label}</span>
                ) : null}
              </div>
              <AnnouncementDates item={n} />
              <p className="text-xs text-sky-800 mt-1">مخاطب: {roleText(n.roles)}</p>
              <p className="text-sm whitespace-pre-wrap mt-2">{n.body}</p>
              {n.imageUrl ? (
                <AnnouncementMedia
                  url={n.imageUrl}
                  name={n.imageName}
                  title={n.title}
                  className="max-h-48 w-full rounded-lg object-contain bg-slate-50"
                />
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn-outline px-2 py-1 text-xs"
                  disabled={moving || globalIndex === 0}
                  onClick={() => move(i, -1)}
                  title="انتقال به بالا"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn-outline px-2 py-1 text-xs"
                  disabled={moving || globalIndex >= total - 1}
                  onClick={() => move(i, 1)}
                  title="انتقال به پایین"
                >
                  ▼
                </button>
              </div>
              <button type="button" className="btn-outline h-fit" onClick={() => startEdit(n)}>
                ویرایش
              </button>
              <button
                className="btn-danger h-fit"
                onClick={async () => {
                  try {
                    await api(`/api/announcements/manage?id=${n._id}`, { method: "DELETE" });
                    if (editing === n._id) cancelEdit();
                    await load();
                    setMsgType("success");
                    setMsg("اطلاعیه حذف شد");
                  } catch (err) {
                    setRowMsg({ id: n._id, text: err.message, type: "error" });
                  }
                }}
              >
                حذف
              </button>
              {rowMsg?.id === n._id ? <Feedback message={rowMsg.text} type={rowMsg.type} /> : null}
            </div>
          </div>
        );
      })}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPage={(p) => load(p, limit)}
        onLimit={(l) => load(1, l)}
      />
    </div>
  );
}
