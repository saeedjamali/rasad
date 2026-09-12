"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import FilePicker from "@/components/FilePicker";
import Timeline from "@/components/Timeline";
import StatusBadge from "@/components/StatusBadge";
import RegionSelect from "@/components/RegionSelect";
import { REQUEST_SUBMIT_CLOSED_MESSAGE, REVIEW_RESULT_USER_MESSAGE, STATUSES } from "@/lib/constants";
import { categoryIsOffered, requestCategoryIdsOf } from "@/lib/requestDisplay";
import { CategoryBadges } from "@/components/CategoryBadges";
import PreviousRequestDrawer from "@/components/PreviousRequestDrawer";
import Feedback from "@/components/Feedback";

const emptyForm = {
  title: "",
  categoryIds: [],
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
  const [allowRequestSubmit, setAllowRequestSubmit] = useState(true);
  const [allowMultiMainCategory, setAllowMultiMainCategory] = useState(false);

  async function load() {
    const [c, list] = await Promise.all([
      api("/api/categories"),
      api("/api/requests?all=1"),
    ]);
    setCategories(c.list || []);
    setAllowMultiMainCategory(Boolean(c.allowMultiMainCategory));
    const items = list.list || [];
    const open = items.find((r) => r.status !== STATUSES.REVIEW_RESULT);
    const closedItems = items.filter((r) => r.status === STATUSES.REVIEW_RESULT);
    setAllowNewRequestAfterFinal(Boolean(list.allowNewRequestAfterFinal));
    setAllowRequestSubmit(list.allowRequestSubmit !== false);
    setPrevious(closedItems);
    const current = open || (!list.allowNewRequestAfterFinal ? closedItems[0] : null);
    setRq(current || null);
    if (open) {
      const d = await api(`/api/requests/${open._id}`);
      setLogs(d.logs || []);
      setForm({
        title: d.item?.title || open.title || "",
        categoryIds: requestCategoryIdsOf(d.item || open),
        subcategoryIds: (d.item?.subcategoryIds || open.subcategoryIds || []).map(String),
        proposedDistrictCode: d.item?.proposedDistrictCode || open.proposedDistrictCode || "",
        proposedDistrictName: d.item?.proposedDistrictName || open.proposedDistrictName || "",
        description: d.item?.description || open.description || "",
      });
      setFiles(d.item?.attachments || open.attachments || []);
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

  const selectedSet = new Set(form.categoryIds.map(String));
  const parents = categories.filter(
    (c) => !c.parentId && (categoryIsOffered(c) || selectedSet.has(String(c._id)))
  );
  const selectedParents = parents.filter((c) => selectedSet.has(String(c._id)));
  const needsDistrict = selectedParents.some((c) => c.showDistricts);

  function childrenOf(parentId) {
    const selectedSubs = new Set(form.subcategoryIds.map(String));
    return categories.filter(
      (c) =>
        String(c.parentId) === String(parentId) &&
        (categoryIsOffered(c) || selectedSubs.has(String(c._id)))
    );
  }

  function setSingleParent(id) {
    const nextId = String(id || "");
    const keepKids = new Set(childrenOf(nextId).map((c) => String(c._id)));
    setForm((f) => ({
      ...f,
      categoryIds: nextId ? [nextId] : [],
      subcategoryIds: f.subcategoryIds.filter((sid) => keepKids.has(String(sid))),
      proposedDistrictCode: "",
      proposedDistrictName: "",
    }));
  }

  function toggleParent(id) {
    const key = String(id);
    setForm((f) => {
      const has = f.categoryIds.map(String).includes(key);
      const next = has ? f.categoryIds.filter((x) => String(x) !== key) : [...f.categoryIds, key];
      const removedKids = new Set(childrenOf(key).map((c) => String(c._id)));
      const stillNeedsDistrict = next.some((pid) => parents.find((p) => String(p._id) === String(pid))?.showDistricts);
      return {
        ...f,
        categoryIds: next,
        subcategoryIds: has ? f.subcategoryIds.filter((sid) => !removedKids.has(String(sid))) : f.subcategoryIds,
        proposedDistrictCode: stillNeedsDistrict ? f.proposedDistrictCode : "",
        proposedDistrictName: stillNeedsDistrict ? f.proposedDistrictName : "",
      };
    });
  }

  function toggleSub(id, parentId, single) {
    const key = String(id);
    const siblingIds = new Set(childrenOf(parentId).map((c) => String(c._id)));
    setForm((f) => {
      if (single) {
        const without = f.subcategoryIds.filter((x) => !siblingIds.has(String(x)));
        return { ...f, subcategoryIds: [...without, key] };
      }
      const has = f.subcategoryIds.map(String).includes(key);
      return {
        ...f,
        subcategoryIds: has ? f.subcategoryIds.filter((x) => String(x) !== key) : [...f.subcategoryIds, key],
      };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!form.categoryIds.length) {
      setMsgType("error");
      setMsg("دسته‌بندی را انتخاب کنید");
      return;
    }
    const payload = {
      ...form,
      categoryId: form.categoryIds[0],
      categoryIds: form.categoryIds,
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
  const canStartNew = allowRequestSubmit && allowNewRequestAfterFinal && !hasOpen && previous.length > 0;
  const canCreateFirst = allowRequestSubmit && !rq;
  const canEditExisting =
    rq &&
    (rq.status === STATUSES.WAITING_PROVINCE_REVIEW || rq.status === STATUSES.RETURNED_TO_USER);
  const canEdit = canEditExisting || canStartNew || canCreateFirst;

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
          <CategoryBadges item={rq} showSubs />
          {rq.status === STATUSES.REVIEW_RESULT && <p className="text-sm">{REVIEW_RESULT_USER_MESSAGE}</p>}
          {rq.proposedRegionLabel || rq.proposedDistrictName ? (
            <p className="text-sm">مقصد پیشنهادی: {rq.proposedRegionLabel || rq.proposedDistrictName}</p>
          ) : null}
        </div>
      )}

      {!allowRequestSubmit && !canEditExisting ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {REQUEST_SUBMIT_CLOSED_MESSAGE}
        </div>
      ) : null}

      {canEdit && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          {canStartNew ? <h2 className="font-bold">ثبت درخواست جدید</h2> : null}
          <div>
            <label className="label">دسته‌بندی</label>
            {allowMultiMainCategory ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">می‌توانید چند دسته اصلی را با هم انتخاب کنید.</p>
                {parents.map((c) => {
                  const checked = form.categoryIds.map(String).includes(String(c._id));
                  const kids = childrenOf(c._id);
                  return (
                    <div key={c._id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleParent(c._id)}
                        />
                        <span>
                          <span className="font-medium">{c.title}</span>
                          {c.description ? (
                            <span className="block text-xs text-slate-500 mt-1">{c.description}</span>
                          ) : null}
                        </span>
                      </label>
                      {checked && kids.length > 0 && c.selectionType !== "none" ? (
                        <div className="ms-6 space-y-1">
                          <div className="text-xs text-slate-500">زیر‌دسته</div>
                          {kids.map((sub) => (
                            <label key={sub._id} className="flex items-center gap-2 text-sm">
                              <input
                                type={c.selectionType === "single" ? "radio" : "checkbox"}
                                name={`sub-${c._id}`}
                                checked={form.subcategoryIds.map(String).includes(String(sub._id))}
                                onChange={() => toggleSub(sub._id, c._id, c.selectionType === "single")}
                              />
                              {sub.title}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <select
                  className="input"
                  value={form.categoryIds[0] || ""}
                  onChange={(e) => setSingleParent(e.target.value)}
                  required
                >
                  <option value="">انتخاب کنید</option>
                  {parents.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {selectedParents[0]?.description ? (
                  <p className="text-xs text-slate-500 mt-1">{selectedParents[0].description}</p>
                ) : null}
                {selectedParents[0] && childrenOf(selectedParents[0]._id).length > 0 ? (
                  <div className="mt-3">
                    <label className="label">زیر‌دسته</label>
                    <div className="space-y-1">
                      {childrenOf(selectedParents[0]._id).map((sub) => (
                        <label key={sub._id} className="flex items-center gap-2 text-sm">
                          <input
                            type={selectedParents[0].selectionType === "single" ? "radio" : "checkbox"}
                            name="sub"
                            checked={form.subcategoryIds.map(String).includes(String(sub._id))}
                            onChange={() =>
                              toggleSub(sub._id, selectedParents[0]._id, selectedParents[0].selectionType === "single")
                            }
                          />
                          {sub.title}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {needsDistrict && (
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
