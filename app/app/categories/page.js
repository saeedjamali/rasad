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

function MoveButtons({ disabledUp, disabledDown, onUp, onDown, busy }) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className="btn-outline px-2 py-1 text-xs"
        disabled={busy || disabledUp}
        onClick={onUp}
        title="انتقال به بالا"
      >
        ▲
      </button>
      <button
        type="button"
        className="btn-outline px-2 py-1 text-xs"
        disabled={busy || disabledDown}
        onClick={onDown}
        title="انتقال به پایین"
      >
        ▼
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [allList, setAllList] = useState([]);
  const [allParents, setAllParents] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [rowMsg, setRowMsg] = useState(null);
  const [moving, setMoving] = useState(null);

  async function load(nextPage = page, nextLimit = limit) {
    const [d, all] = await Promise.all([
      api(`/api/categories?page=${nextPage}&limit=${nextLimit}`),
      api("/api/categories?all=1"),
    ]);
    if (!(d.list || []).filter((c) => !c.parentId).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
    const full = all.list || [];
    setAllList(full);
    setAllParents(full.filter((c) => !c.parentId));
  }
  useEffect(() => {
    load(1);
  }, []);

  const parents = list.filter((c) => !c.parentId);
  const parentIds = allParents.map((c) => c._id);

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

  async function move(ids, index, dir, rowId) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= ids.length) return;
    setMoving(rowId);
    setRowMsg(null);
    try {
      const next = ids.slice();
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      await api("/api/categories", { method: "PUT", body: { reorder: next } });
      await load();
      setMsgType("success");
      setMsg("ترتیب نمایش به‌روز شد");
    } catch (err) {
      setRowMsg({ id: rowId, text: err.message, type: "error" });
    } finally {
      setMoving(null);
    }
  }

  function childrenOf(parentId) {
    return allList.filter((c) => String(c.parentId) === String(parentId));
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
        <label className="block">
          <div className="label">ترتیب نمایش</div>
          <input className="input" type="number" placeholder="ترتیب" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          <p className="text-xs text-slate-500 mt-1">عدد کوچک‌تر بالاتر دیده می‌شود. از دکمه‌های ▲ ▼ فهرست هم می‌توان جابه‌جا کرد.</p>
        </label>
        <ActionRow message={msg} type={msgType}>
          <button className="btn-primary">{editing ? "ویرایش" : "ثبت دسته"}</button>
        </ActionRow>
      </form>
      <div className="space-y-3">
        {parents.map((p) => {
          const gi = parentIds.findIndex((id) => String(id) === String(p._id));
          const kids = childrenOf(p._id);
          const childIds = kids.map((c) => c._id);
          return (
          <div key={p._id} className="card p-4">
            <div className="flex justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-0.5">ترتیب {p.order || gi + 1}</span>
                  <b>{p.title}</b>
                  {p.showDistricts ? <span className="text-xs text-amber-700">نمایش مناطق</span> : null}
                </div>
                <p className="text-sm text-slate-500">{p.description}</p>
                <p className="text-xs">نوع انتخاب: {p.selectionType}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex flex-wrap justify-end gap-2">
                  <MoveButtons
                    busy={Boolean(moving)}
                    disabledUp={gi <= 0}
                    disabledDown={gi < 0 || gi >= parentIds.length - 1}
                    onUp={() => move(parentIds, gi, -1, p._id)}
                    onDown={() => move(parentIds, gi, 1, p._id)}
                  />
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
            <ul className="mt-2 text-sm space-y-1">
              {kids.map((c, ci) => (
                <li key={c._id} className="flex justify-between gap-3 items-center rounded-lg px-2 py-1 hover:bg-slate-50">
                  <span>{c.title}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <MoveButtons
                      busy={Boolean(moving)}
                      disabledUp={ci === 0}
                      disabledDown={ci === kids.length - 1}
                      onUp={() => move(childIds, ci, -1, c._id)}
                      onDown={() => move(childIds, ci, 1, c._id)}
                    />
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
          );
        })}
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
