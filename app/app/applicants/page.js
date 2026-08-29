"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import {
  APPLICANT_EXTRA_GROUPS,
  APPLICANT_FIELDS,
  APPLICANT_SELECT_OPTIONS,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_APPLICANT_STATUS,
  ROLES,
} from "@/lib/constants";
import { validateMobile, validatePersonnelCode } from "@/lib/identity";
import ExcelImport from "@/components/ExcelImport";
import Modal from "@/components/Modal";
import RegionSelect, { useRegions } from "@/components/RegionSelect";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";

const fieldLabel = Object.fromEntries(APPLICANT_FIELDS);

function blankForm() {
  return {
    ...Object.fromEntries(APPLICANT_FIELDS.map(([k]) => [k, ""])),
    academicYear: DEFAULT_ACADEMIC_YEAR,
    status: DEFAULT_APPLICANT_STATUS,
  };
}

function SelectOrInput({ k, value, onChange, required }) {
  const options = APPLICANT_SELECT_OPTIONS[k];
  if (!options) {
    return (
      <input
        className="input mt-1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    );
  }
  const extra = value && !options.includes(value) ? [value] : [];
  return (
    <select
      className="input mt-1"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">انتخاب کنید</option>
      {[...options, ...extra].map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <span className="label mb-0">
      {children}
      {hint ? <span className="text-red-600"> *</span> : null}
    </span>
  );
}

export default function ApplicantsPage() {
  const regions = useRegions();
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(blankForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showExtra, setShowExtra] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [personnelHint, setPersonnelHint] = useState(null);
  const [addingPersonnel, setAddingPersonnel] = useState(false);
  const [role, setRole] = useState("");
  const [allowDistrictAddApplicant, setAllowDistrictAddApplicant] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [expertRegion, setExpertRegion] = useState({
    districtCode: "",
    districtName: "",
    districtLabel: "",
  });
  const lookupSeq = useRef(0);
  const isDistrict = role === ROLES.district_transfer;

  function lockedDistrictFields() {
    if (!isDistrict) return {};
    return {
      districtCode: expertRegion.districtCode,
      originDistrict: expertRegion.districtName,
      serviceDistrict: expertRegion.districtName,
      originProvince: "خراسان رضوی",
    };
  }

  async function load(nextPage = page, nextLimit = limit) {
    const d = await api(
      `/api/applicants?q=${encodeURIComponent(q)}&page=${nextPage}&limit=${nextLimit}`
    );
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }
  useEffect(() => {
    Promise.all([api("/api/auth/me"), api("/api/settings")])
      .then(([d, s]) => {
        const nextRole = d.user?.activeRole || "";
        const allowed = Boolean(s.settings?.allowDistrictAddApplicant);
        const region = {
          districtCode: d.user?.districtCode || "",
          districtName: d.user?.districtName || "",
          districtLabel: d.user?.districtLabel || "",
        };
        setRole(nextRole);
        setExpertRegion(region);
        setAllowDistrictAddApplicant(allowed);
        setSettingsReady(true);
        if (nextRole === ROLES.district_transfer) {
          setForm((f) => ({
            ...f,
            districtCode: region.districtCode,
            originDistrict: region.districtName,
            serviceDistrict: region.districtName,
            originProvince: "خراسان رضوی",
          }));
        }
        if (nextRole === ROLES.district_transfer && !allowed) return;
        return load(1);
      })
      .catch((e) => {
        setSettingsReady(true);
        showMessage(e.message, "error");
      });
  }, []);

  function showMessage(text, type) {
    setMsg(text);
    setMsgType(type);
  }

  function resetForm() {
    setForm({ ...blankForm(), ...lockedDistrictFields() });
    setEditing(null);
    setShowExtra(false);
    setFieldErrors({});
    setPersonnelHint(null);
  }

  function closeForm() {
    if (saving) return;
    resetForm();
    setFormOpen(false);
    showMessage("", "");
  }

  function openAddForm() {
    resetForm();
    showMessage("", "");
    setFormOpen(true);
  }

  function applyPersonnel(item) {
    setForm((f) => ({
      ...f,
      personnelCode: item.personnelCode || f.personnelCode,
      firstName: item.firstName || f.firstName,
      lastName: item.lastName || f.lastName,
      ...(isDistrict
        ? lockedDistrictFields()
        : {
            districtCode: item.districtCode || f.districtCode,
            originDistrict: item.districtName || f.originDistrict,
            serviceDistrict: item.districtName || f.serviceDistrict,
          }),
      originProvince: f.originProvince || "خراسان رضوی",
    }));
  }

  async function lookupPersonnel(rawCode) {
    const code = validatePersonnelCode(rawCode);
    if (!code.ok) {
      setPersonnelHint(null);
      return;
    }
    const seq = ++lookupSeq.current;
    try {
      const d = await api(`/api/personnel/lookup?code=${encodeURIComponent(code.value)}`);
      if (seq !== lookupSeq.current) return;
      if (d.item) {
        applyPersonnel(d.item);
        if (d.alreadyApplicant) {
          setPersonnelHint({
            type: "exists",
            text: "این فرد قبلاً در فهرست متقاضیان ثبت شده است. فقط شماره همراه را از جدول پایین ویرایش کنید.",
          });
        } else {
          setPersonnelHint({
            type: "found",
            text: isDistrict
              ? "اطلاعات این کد از جدول پرسنل بارگذاری شد. فقط شماره همراه و منطقه مقصد را وارد کنید."
              : "اطلاعات این کد از جدول پرسنل بارگذاری شد. در صورت نیاز ویرایش کنید.",
          });
        }
      } else {
        setPersonnelHint({
          type: "missing",
          text:
            d.message ||
            (isDistrict
              ? "این کد پرسنلی در اطلاعات پرسنل ثبت نشده است و امکان افزودن وجود ندارد."
              : "این کد پرسنلی در اطلاعات پرسنل ثبت نشده است. پس از تکمیل نام، نام خانوادگی و منطقه می‌توانید آن را اضافه کنید."),
        });
      }
    } catch (err) {
      if (seq !== lookupSeq.current) return;
      setPersonnelHint({ type: "missing", text: err.message });
    }
  }

  async function addPersonnelFromForm() {
    const code = validatePersonnelCode(form.personnelCode);
    if (!code.ok) {
      showMessage(code.message, "error");
      return;
    }
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      showMessage("برای افزودن به اطلاعات پرسنل، نام و نام خانوادگی را وارد کنید.", "error");
      return;
    }
    if (!form.districtCode && !form.serviceDistrict) {
      showMessage("برای افزودن به اطلاعات پرسنل، منطقه محل خدمت / مبدا را انتخاب کنید.", "error");
      return;
    }
    setAddingPersonnel(true);
    try {
      const result = await api("/api/personnel", {
        method: "POST",
        body: {
          personnelCode: form.personnelCode,
          firstName: form.firstName,
          lastName: form.lastName,
          districtCode: form.districtCode || serviceCode,
          serviceDistrict: form.serviceDistrict,
          originDistrict: form.originDistrict,
        },
      });
      setPersonnelHint({
        type: "found",
        text: result.message || "این فرد به اطلاعات پرسنل اضافه شد.",
      });
      showMessage(result.message || "به اطلاعات پرسنل اضافه شد.", "success");
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      setAddingPersonnel(false);
    }
  }

  function checkIdentityField(key, nextForm = form) {
    setFieldErrors((current) => {
      const next = { ...current };
      if (key === "personnelCode") {
        const code = validatePersonnelCode(nextForm.personnelCode);
        if (!code.ok) next.personnelCode = code.message;
        else delete next.personnelCode;
      }
      if (key === "mobile") {
        const mob = validateMobile(nextForm.mobile);
        if (!mob.ok) next.mobile = mob.message;
        else delete next.mobile;
      }
      return next;
    });
  }

  async function save(e) {
    e.preventDefault();
    showMessage("", "");
    const errors = {};
    const code = validatePersonnelCode(form.personnelCode);
    if (!code.ok) errors.personnelCode = code.message;
    const mob = validateMobile(form.mobile);
    if (!mob.ok) errors.mobile = mob.message;
    setFieldErrors(errors);
    if (errors.personnelCode || errors.mobile) {
      showMessage(errors.personnelCode || errors.mobile, "error");
      return;
    }
    if (isDistrict && !editing && personnelHint?.type !== "found") {
      showMessage(
        personnelHint?.text || "فقط پرسنل همان منطقه که در اطلاعات پرسنل هستند قابل افزودن هستند.",
        "error"
      );
      return;
    }
    setSaving(true);
    try {
      const result = editing
        ? await api(`/api/applicants/${editing}`, { method: "PUT", body: form })
        : await api("/api/applicants", { method: "POST", body: form });
      resetForm();
      setFormOpen(false);
      showMessage(result.message || (editing ? "ویرایش شد" : "متقاضی ثبت شد"), "success");
      load();
    } catch (err) {
      showMessage(err.message, "error");
      const text = err.message || "";
      const next = {};
      if (text.includes("کد پرسنلی")) next.personnelCode = text;
      if (text.includes("شماره همراه")) next.mobile = text;
      if (Object.keys(next).length) setFieldErrors(next);
    } finally {
      setSaving(false);
    }
  }

  const serviceCode =
    regions.find(
      (r) => r.districtName === form.serviceDistrict || r.districtCode === form.serviceDistrict
    )?.districtCode || "";

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const districtAddBlocked = isDistrict && !editing && personnelHint?.type !== "found";
  const lockIdentity = isDistrict;
  const lockPersonnelCode = isDistrict && Boolean(editing);
  const lockDest = isDistrict && Boolean(editing);

  if (settingsReady && isDistrict && !allowDistrictAddApplicant) {
    return (
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-2xl font-bold">اطلاعات متقاضیان</h1>
        <p className="card p-4 text-sm text-slate-600">
          امکان افزودن متقاضی برای کارشناس انتقالات منطقه از تنظیمات سامانه غیرفعال است.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">اطلاعات متقاضیان</h1>
        <button type="button" className="btn-primary" onClick={openAddForm}>
          افزودن متقاضی
        </button>
      </div>
      {msg && !formOpen ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            msgType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {msg}
        </div>
      ) : null}
      {role === ROLES.admin ? (
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <a className="btn-outline" href="/api/applicants/export">
            دریافت اکسل
          </a>
        </div>
        <ExcelImport
            url="/api/applicants/import"
            onDone={() => load(1)}
            extraFields={
              <label className="text-sm">
                حالت
                <select name="mode" className="input mt-1">
                  <option value="upsert">ایجاد و ویرایش گروهی</option>
                  <option value="create">فقط ایجاد</option>
                </select>
              </label>
            }
          />
      </div>
      ) : null}
      <Modal
        open={formOpen}
        wide
        title={editing ? (isDistrict ? "ویرایش شماره همراه" : "ویرایش متقاضی") : "افزودن متقاضی"}
        onClose={closeForm}
      >
      <form onSubmit={save} className="space-y-5">
        <div>
          {msg ? (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                msgType === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {msg}
            </div>
          ) : null}
          <p className="text-xs text-slate-500 mb-3">
            {isDistrict
              ? "فقط پرسنل همین منطقه که هنوز در فهرست متقاضیان نیستند قابل افزودن هستند. ویرایش سایر اطلاعات ممکن نیست و فقط شماره همراه قابل تغییر است."
              : "با ثبت متقاضی، حساب کاربری با نقش پرسنل و ردیف اطلاعات پرسنل هم ایجاد یا به‌روز می‌شود."}
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-sm">
              <FieldLabel hint>کد پرسنلی</FieldLabel>
              <input
                className={`input mt-1 ${fieldErrors.personnelCode ? "border-red-500" : ""} ${lockPersonnelCode ? "bg-slate-50" : ""}`}
                value={form.personnelCode || ""}
                onChange={(e) => {
                  setField("personnelCode", e.target.value);
                  setPersonnelHint(null);
                }}
                onBlur={(e) => {
                  checkIdentityField("personnelCode", { ...form, personnelCode: e.target.value });
                  if (!lockPersonnelCode) lookupPersonnel(e.target.value);
                }}
                required
                readOnly={lockPersonnelCode}
                autoComplete="off"
              />
              {fieldErrors.personnelCode ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.personnelCode}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">۴ تا ۲۰ نویسه؛ عدد یا حروف انگلیسی</p>
              )}
            </label>
            <label className="text-sm">
              <FieldLabel hint>نام</FieldLabel>
              <input
                className={`input mt-1 ${lockIdentity ? "bg-slate-50" : ""}`}
                value={form.firstName || ""}
                onChange={(e) => setField("firstName", e.target.value)}
                required
                readOnly={lockIdentity}
              />
            </label>
            <label className="text-sm">
              <FieldLabel hint>نام خانوادگی</FieldLabel>
              <input
                className={`input mt-1 ${lockIdentity ? "bg-slate-50" : ""}`}
                value={form.lastName || ""}
                onChange={(e) => setField("lastName", e.target.value)}
                required
                readOnly={lockIdentity}
              />
            </label>
            <label className="text-sm md:col-span-1">
              <FieldLabel hint>شماره همراه</FieldLabel>
              <input
                className={`input mt-1 ${fieldErrors.mobile ? "border-red-500" : ""}`}
                value={form.mobile || ""}
                onChange={(e) => setField("mobile", e.target.value)}
                onBlur={() => checkIdentityField("mobile")}
                required
                dir="ltr"
                inputMode="tel"
                placeholder="09123456789"
                maxLength={13}
              />
              {fieldErrors.mobile ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">۱۱ رقم و شروع با ۰۹</p>
              )}
            </label>
          </div>
          {personnelHint ? (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                personnelHint.type === "found"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-950 border border-amber-200"
              }`}
            >
              <p>{personnelHint.text}</p>
              {personnelHint.type === "missing" && !isDistrict ? (
                <button
                  type="button"
                  className="btn-outline mt-2"
                  disabled={addingPersonnel}
                  onClick={addPersonnelFromForm}
                >
                  {addingPersonnel ? "در حال افزودن..." : "افزودن به اطلاعات پرسنل"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="font-medium mb-3">مناطق</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-sm">
              <FieldLabel hint>منطقه محل خدمت</FieldLabel>
              <div className="mt-1">
                {isDistrict ? (
                  <input
                    className="input bg-slate-50"
                    readOnly
                    value={
                      expertRegion.districtLabel ||
                      [expertRegion.districtCode, expertRegion.districtName].filter(Boolean).join(" — ")
                    }
                  />
                ) : (
                  <RegionSelect
                    value={serviceCode}
                    required
                    onChange={(_code, region) =>
                      setForm((f) => ({
                        ...f,
                        serviceDistrict: region?.districtName || "",
                      }))
                    }
                  />
                )}
              </div>
            </label>
            <label className="text-sm">
              <FieldLabel hint>مبدا</FieldLabel>
              <div className="mt-1">
                {isDistrict ? (
                  <input
                    className="input bg-slate-50"
                    readOnly
                    value={
                      expertRegion.districtLabel ||
                      [expertRegion.districtCode, expertRegion.districtName].filter(Boolean).join(" — ")
                    }
                  />
                ) : (
                  <RegionSelect
                    value={form.districtCode}
                    required
                    onChange={(code, region) =>
                      setForm((f) => ({
                        ...f,
                        districtCode: code,
                        originDistrict: region?.districtName || "",
                        originProvince: f.originProvince || "خراسان رضوی",
                      }))
                    }
                  />
                )}
              </div>
            </label>
            <label className="text-sm">
              <FieldLabel hint>مقصد</FieldLabel>
              <div className="mt-1">
                <RegionSelect
                  value={form.destCode}
                  required
                  disabled={lockDest}
                  onChange={(code, region) =>
                    setForm((f) => ({
                      ...f,
                      destCode: code,
                      destDistrict: region?.districtName || "",
                      destProvince: f.destProvince || "خراسان رضوی",
                    }))
                  }
                />
              </div>
            </label>
          </div>
          {isDistrict ? (
            <p className="text-xs text-slate-500 mt-2">
              منطقه محل خدمت و مبدا روی منطقه کارشناس انتقالات قفل است و قابل تغییر نیست.
            </p>
          ) : null}
        </div>

        {!isDistrict ? (
        <div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? "بستن سایر جزئیات" : "نمایش سایر جزئیات"}
          </button>
          {showExtra ? (
            <div className="mt-4 space-y-5">
              {APPLICANT_EXTRA_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">{group.title}</h3>
                  <div className="grid md:grid-cols-3 gap-3">
                    {group.keys.map((k) => (
                      <label key={k} className="text-sm">
                        {fieldLabel[k]}
                        <SelectOrInput
                          k={k}
                          value={form[k]}
                          onChange={(value) => setField(k, value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">
              جنسیت، وضعیت تاهل، نوع استخدام و بقیه فیلدها در جزئیات هستند و الزامی نیستند.
            </p>
          )}
        </div>
        ) : null}

        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving || districtAddBlocked}>
            {saving
              ? "در حال ذخیره..."
              : editing
                ? isDistrict
                  ? "ذخیره شماره همراه"
                  : "ذخیره ویرایش"
                : "افزودن متقاضی"}
          </button>
          <button type="button" className="btn-outline" onClick={closeForm} disabled={saving}>
            انصراف
          </button>
        </div>
      </form>
      </Modal>
      <div className="flex gap-2">
        <input
          className="input max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="کد پرسنلی، نام، موبایل، منطقه"
        />
        <button className="btn-primary" onClick={() => load(1)}>
          جستجو
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>کد پرسنلی</th>
              <th>نام</th>
              <th>نام خانوادگی</th>
              <th>موبایل</th>
              <th>منطقه مبدا</th>
              <th>منطقه مقصد</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a._id}>
                <td>{a.personnelCode}</td>
                <td>{a.firstName || "—"}</td>
                <td>{a.lastName || "—"}</td>
                <td>{a.mobile}</td>
                <td>{a.originRegionLabel || a.originDistrict || "—"}</td>
                <td>{a.destRegionLabel || a.destDistrict || "—"}</td>
                <td>{a.status}</td>
                <td className="flex gap-2">
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setEditing(a._id);
                      setForm({
                        ...blankForm(),
                        ...a,
                        academicYear: a.academicYear || DEFAULT_ACADEMIC_YEAR,
                        ...lockedDistrictFields(),
                      });
                      setShowExtra(false);
                      setFieldErrors({});
                      setPersonnelHint(null);
                      showMessage("", "");
                      setFormOpen(true);
                    }}
                  >
                    {isDistrict ? "ویرایش شماره همراه" : "ویرایش"}
                  </button>
                  {!isDistrict ? (
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      if (!confirm("حذف شود؟")) return;
                      try {
                        await api(`/api/applicants/${a._id}`, { method: "DELETE" });
                        showMessage("متقاضی حذف شد", "success");
                        load();
                      } catch (err) {
                        showMessage(err.message, "error");
                      }
                    }}
                  >
                    حذف
                  </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
