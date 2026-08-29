"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";
import Feedback, { ActionRow } from "@/components/Feedback";

const empty = {
  title: "",
  description: "",
  transferType: "نقل و انتقال",
  showDistricts: false,
  parentId: "",
  selectionType: "none",
  order: 0,
};

export default function CategoriesPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [allParents, setAllParents] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [rowMsg, setRowMsg] = useState(null);

  async function load(nextPage = page, nextLimit = limit) {
    const [d, all] = await Promise.all([
      api(`/api/categories?page=${nextPage}&limit=${nextLimit}`),
      api("/api/categories?all=1"),
    ]);
    if (!(d.list || []).filter((c) => !c.parentId).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
    setAllParents((all.list || []).filter((c) => !c.parentId));
  }
  useEffect(() => {
    load(1);
  }, []);

  const parents = list.filter((c) => !c.parentId);

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      const body = { ...form, parentId: form.parentId || null };
      if (editing) await api(`/api/categories/${editing}`, { method: "PUT", body });
      else await api("/api/categories", { method: "POST", body });
      setForm(empty);
      setEditing(null);
      await load();
      setMsgType("success");
      setMsg(editing ? "دسته ویرایش شد" : "دسته ثبت شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">دسته‌بندی‌ها بر اساس نوع انتقال</h1>
      <form onSubmit={save} className="card p-4 grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
          <option value="">بدون والد (دسته اصلی)</option>
          {allParents.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </select>
        <textarea className="input md:col-span-2" placeholder="توضیح / راهنما" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select className="input" value={form.selectionType} onChange={(e) => setForm({ ...form, selectionType: e.target.value })}>
          <option value="none">بدون زیر‌انتخاب</option>
          <option value="single">زیر‌دسته‌ها تک‌انتخابی</option>
          <option value="checklist">زیر‌دسته‌ها چک‌لیست</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showDistricts} onChange={(e) => setForm({ ...form, showDistricts: e.target.checked })} />
          نمایش مناطق (انتخاب مقصد توسط کاربر)
        </label>
        <input className="input" type="number" placeholder="ترتیب" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
        <ActionRow message={msg} type={msgType}>
          <button className="btn-primary">{editing ? "ویرایش" : "ثبت دسته"}</button>
        </ActionRow>
      </form>
      <div className="space-y-3">
        {parents.map((p) => (
          <div key={p._id} className="card p-4">
            <div className="flex justify-between gap-3">
              <div>
                <b>{p.title}</b>
                {p.showDistricts ? <span className="ms-2 text-xs text-amber-700">نمایش مناطق</span> : null}
                <p className="text-sm text-slate-500">{p.description}</p>
                <p className="text-xs">نوع انتخاب: {p.selectionType}</p>
              </div>
              <div className="flex gap-2">
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                <button className="btn-outline" onClick={() => { setEditing(p._id); setForm({ ...empty, ...p, parentId: "" }); }}>ویرایش</button>
                <button className="btn-danger" onClick={async () => {
                  try {
                    await api(`/api/categories/${p._id}`, { method: "DELETE" });
                    await load();
                    setMsgType("success");
                    setMsg("دسته حذف شد");
                  } catch (err) {
                    setRowMsg({ id: p._id, text: err.message, type: "error" });
                  }
                }}>حذف</button>
                </div>
                {rowMsg?.id === p._id ? <Feedback message={rowMsg.text} type={rowMsg.type} /> : null}
              </div>
              </div>
            </div>
            <ul className="mt-2 text-sm list-disc pr-5">
              {list.filter((c) => String(c.parentId) === String(p._id)).map((c) => (
                <li key={c._id} className="flex justify-between">
                  {c.title}
                  <span className="flex gap-2">
                    <button className="text-sky-700" onClick={() => { setEditing(c._id); setForm({ ...empty, ...c, parentId: p._id }); }}>ویرایش</button>
                    <button className="text-red-700" onClick={async () => {
                      try {
                        await api(`/api/categories/${c._id}`, { method: "DELETE" });
                        await load();
                        setRowMsg({ id: c._id, text: "زیر‌دسته حذف شد", type: "success" });
                      } catch (err) {
                        setRowMsg({ id: c._id, text: err.message, type: "error" });
                      }
                    }}>حذف</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
