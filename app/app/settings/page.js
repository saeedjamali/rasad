"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Feedback from "@/components/Feedback";

export default function SettingsPage() {
  const [allowNewRequestAfterFinal, setAllowNewRequestAfterFinal] = useState(false);
  const [allowDistrictAddApplicant, setAllowDistrictAddApplicant] = useState(false);
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(false);
  const [smsOnline, setSmsOnline] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [services, setServices] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await api("/api/settings");
    setAllowNewRequestAfterFinal(Boolean(d.settings?.allowNewRequestAfterFinal));
    setAllowDistrictAddApplicant(Boolean(d.settings?.allowDistrictAddApplicant));
    setAllowPasswordLogin(Boolean(d.settings?.allowPasswordLogin));
    setSmsOnline(Boolean(d.settings?.smsOnline));
    setSystemEnabled(d.settings?.systemEnabled !== false);
    setServices(Array.isArray(d.settings?.services) ? d.settings.services : []);
  }

  useEffect(() => {
    load().catch((e) => {
      setMsgType("error");
      setMsg(e.message);
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api("/api/settings", {
        method: "PUT",
        body: {
          allowNewRequestAfterFinal,
          allowDistrictAddApplicant,
          allowPasswordLogin,
          smsOnline,
          systemEnabled,
          services,
        },
      });
      setMsgType("success");
      setMsg("تنظیمات ذخیره شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold">تنظیمات</h1>
      <form onSubmit={save} className="card p-4 space-y-4">
        <label className="flex items-start gap-3 text-sm leading-7">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={allowNewRequestAfterFinal}
            onChange={(e) => setAllowNewRequestAfterFinal(e.target.checked)}
          />
          <span>
            امکان ثبت درخواست مجدد بعد از بررسی نهایی برای کاربر فراهم شود.
            <span className="block text-xs text-slate-500 mt-1">
              اگر این گزینه فعال باشد، پس از اتمام گردش‌کار یک درخواست، متقاضی می‌تواند درخواست جدیدی ثبت کند. در غیر این صورت ثبت درخواست جدید ممکن نیست.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-7">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={allowDistrictAddApplicant}
            onChange={(e) => setAllowDistrictAddApplicant(e.target.checked)}
          />
          <span>
            امکان افزودن متقاضی در صفحه متقاضیان برای کارشناس انتقالات منطقه هم فراهم شود.
            <span className="block text-xs text-slate-500 mt-1">
              اگر فعال باشد، کارشناس انتقالات منطقه فقط پرسنل همان منطقه را که هنوز در فهرست متقاضیان نیستند می‌تواند اضافه کند و فقط شماره همراه همان فرد را ویرایش می‌کند. اگر فرد در اطلاعات پرسنل نباشد، امکان افزودن ندارد. مدیر سیستم و کارشناس انتقالات استان بدون این محدودیت کار می‌کنند.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-7">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={allowPasswordLogin}
            onChange={(e) => setAllowPasswordLogin(e.target.checked)}
          />
          <span>
            ورود با رمز عبور فعال باشد.
            <span className="block text-xs text-slate-500 mt-1">
              اگر فعال باشد، کاربران می‌توانند در پروفایل برای خود رمز تعیین کنند و از صفحه ورود با شماره همراه و رمز وارد شوند. ورود با پیامک همچنان در دسترس است. اگر غیرفعال باشد فقط ورود با کد یکبارمصرف ممکن است.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-7">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={smsOnline}
            onChange={(e) => setSmsOnline(e.target.checked)}
          />
          <span>
            ارسال پیامک به‌صورت آنلاین فعال باشد.
            <span className="block text-xs text-slate-500 mt-1">
              اگر فعال باشد، کد ورود و پیامک‌های سامانه از پنل پیامک واقعی ارسال می‌شود. اگر غیرفعال باشد، پیامک ارسال نمی‌شود و کد ورود روی صفحه نمایش داده می‌شود (حالت فعلی آزمایشی).
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-7">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={systemEnabled}
            onChange={(e) => setSystemEnabled(e.target.checked)}
          />
          <span>
            سامانه برای کاربران فعال باشد.
            <span className="block text-xs text-slate-500 mt-1">
              اگر غیرفعال باشد، برای کاربران پیام «سامانه در حال به‌روزرسانی است» نمایش داده می‌شود و امکان ورود ندارند. مدیر سیستم همچنان می‌تواند وارد شود و سامانه را دوباره فعال کند.
            </span>
          </span>
        </label>
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm">سرویس‌های صفحه اصلی</h2>
              <p className="text-xs text-slate-500 mt-1">
                عنوان، شرح، وضعیت روشن/خاموش و نمایش در صفحه ورود را برای هر سرویس مشخص کنید. می‌توانید سرویس غیرفعال را هم در صفحه اصلی نشان دهید.
              </p>
            </div>
            <button
              type="button"
              className="btn-outline shrink-0"
              onClick={() =>
                setServices((list) => [
                  ...list,
                  { id: `s${Date.now()}`, title: "", description: "", enabled: true, visible: true },
                ])
              }
            >
              افزودن سرویس
            </button>
          </div>
          {services.length ? (
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={s.id || i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          s.enabled !== false
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                        onClick={() =>
                          setServices((list) =>
                            list.map((item, idx) =>
                              idx === i ? { ...item, enabled: item.enabled === false } : item
                            )
                          )
                        }
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            s.enabled !== false ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {s.enabled !== false ? "روشن (فعال)" : "خاموش (غیرفعال)"}
                      </button>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s.visible !== false}
                          onChange={(e) =>
                            setServices((list) =>
                              list.map((item, idx) =>
                                idx === i ? { ...item, visible: e.target.checked } : item
                              )
                            )
                          }
                        />
                        نمایش در صفحه اصلی
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setServices((list) => list.filter((_, idx) => idx !== i))}
                    >
                      حذف
                    </button>
                  </div>
                  <input
                    className="input"
                    placeholder="عنوان سرویس"
                    value={s.title || ""}
                    onChange={(e) =>
                      setServices((list) =>
                        list.map((item, idx) => (idx === i ? { ...item, title: e.target.value } : item))
                      )
                    }
                    required={s.visible !== false}
                  />
                  <textarea
                    className="input min-h-24"
                    placeholder="شرح سرویس"
                    value={s.description || ""}
                    onChange={(e) =>
                      setServices((list) =>
                        list.map((item, idx) =>
                          idx === i ? { ...item, description: e.target.value } : item
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">سرویسی تعریف نشده است.</p>
          )}
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
        <Feedback message={msg} type={msgType} />
      </form>
    </div>
  );
}
