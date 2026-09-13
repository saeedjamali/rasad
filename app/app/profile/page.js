"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, roleName } from "@/lib/client";
import Feedback, { ActionRow } from "@/components/Feedback";
import { formatDateTime } from "@/lib/dates";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionMsg, setSessionMsg] = useState("");
  const [sessionMsgType, setSessionMsgType] = useState("success");
  const [sessionBusy, setSessionBusy] = useState(false);

  async function loadSessions() {
    const d = await api("/api/auth/sessions");
    setSessions(d.list || []);
  }

  useEffect(() => {
    Promise.all([
      api("/api/auth/me"),
      api("/api/settings").catch(() => ({ settings: {} })),
      api("/api/auth/sessions").catch(() => ({ list: [] })),
    ])
      .then(([d, s, sess]) => {
        setUser(d.user);
        setAllowPasswordLogin(Boolean(s.settings?.allowPasswordLogin));
        setSessions(sess.list || []);
      })
      .catch(() => {});
  }, []);

  async function afterSessionChange(d) {
    if (d.loggedOut) {
      router.push("/");
      router.refresh();
      return;
    }
    if (d.list) setSessions(d.list);
    else await loadSessions();
    setSessionMsgType("success");
    setSessionMsg(d.message || "انجام شد");
  }

  async function savePassword(e) {
    e.preventDefault();
    setMsg("");
    if (password.length < 6) {
      setMsgType("error");
      setMsg("رمز عبور باید حداقل ۶ نویسه باشد");
      return;
    }
    if (password !== confirm) {
      setMsgType("error");
      setMsg("تکرار رمز عبور مطابقت ندارد");
      return;
    }
    setBusy(true);
    try {
      const d = await api("/api/auth/password", {
        method: "PUT",
        body: { password, confirm },
      });
      setPassword("");
      setConfirm("");
      setUser((u) => (u ? { ...u, hasPassword: true } : u));
      setMsgType("success");
      setMsg(d.message || "رمز عبور ذخیره شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    setSessionBusy(true);
    setSessionMsg("");
    try {
      const d = await api("/api/auth/sessions", { method: "DELETE", body: { others: true, all: false } });
      await afterSessionChange(d);
    } catch (err) {
      setSessionMsgType("error");
      setSessionMsg(err.message);
    } finally {
      setSessionBusy(false);
    }
  }

  async function revokeAll() {
    if (!window.confirm("همه جلسات فعال بسته می‌شود و از سامانه خارج می‌شوید. ادامه می‌دهید؟")) return;
    setSessionBusy(true);
    setSessionMsg("");
    try {
      const d = await api("/api/auth/sessions", { method: "DELETE", body: { all: true } });
      await afterSessionChange(d);
    } catch (err) {
      setSessionMsgType("error");
      setSessionMsg(err.message);
    } finally {
      setSessionBusy(false);
    }
  }

  async function revokeOne(sid, current) {
    if (current && !window.confirm("این نشست جاری بسته می‌شود و از سامانه خارج می‌شوید. ادامه می‌دهید؟")) return;
    setSessionBusy(true);
    setSessionMsg("");
    try {
      const d = await api(`/api/auth/sessions/${sid}`, { method: "DELETE" });
      await afterSessionChange(d);
    } catch (err) {
      setSessionMsgType("error");
      setSessionMsg(err.message);
    } finally {
      setSessionBusy(false);
    }
  }

  if (!user) return null;
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">پروفایل</h1>
      <div className="card p-4 space-y-2 text-sm">
        <p>شماره همراه: {user.mobile}</p>
        <p>کد پرسنلی: {user.personnelCode}</p>
        {user.districtLabel ? <p>منطقه: {user.districtLabel}</p> : null}
        <p>نقش فعال: {roleName(user.activeRole)}</p>
        <p>نقش‌ها: {user.roles.map(roleName).join("، ")}</p>
      </div>
      <div className={`card p-4 ${allowPasswordLogin ? "" : "opacity-60"}`}>
        <h2 className="font-bold mb-2">
          {user.hasPassword ? "تغییر رمز عبور" : "تخصیص رمز عبور"}
        </h2>
        {allowPasswordLogin ? (
          <form onSubmit={savePassword} className="space-y-3">
            <p className="text-sm text-slate-500">
              با این رمز می‌توانید از صفحه ورود، بدون پیامک وارد سامانه شوید.
            </p>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز جدید"
              minLength={6}
              required
            />
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="تکرار رمز جدید"
              minLength={6}
              required
            />
            <button className="btn-primary" disabled={busy}>
              {busy ? "در حال ذخیره..." : "ذخیره رمز"}
            </button>
            <Feedback message={msg} type={msgType} />
          </form>
        ) : (
          <>
            <p className="text-sm mb-3">ورود با رمز عبور از تنظیمات سامانه غیرفعال است.</p>
            <input className="input mb-2" type="password" disabled placeholder="رمز جدید" />
            <button className="btn-primary" disabled>
              ذخیره رمز
            </button>
          </>
        )}
      </div>
      <div className="card p-4 space-y-3">
        <h2 className="font-bold">جلسات فعال</h2>
        <p className="text-sm text-slate-500">
          نشست‌های باز همین حساب به‌همراه آی‌پی معتبر نمایش داده می‌شود. بستن همه جلسات، ورود از بقیه دستگاه‌ها را قطع می‌کند.
        </p>
        {sessions.length ? (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.sid} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.device}</span>
                    {s.current ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5">همین دستگاه</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500" dir="ltr">
                    {s.ip || "IP نامشخص"}
                  </div>
                  <div className="text-xs text-slate-500">
                    آخرین فعالیت: {formatDateTime(s.lastSeenAt)} · ورود: {formatDateTime(s.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-outline text-xs"
                  disabled={sessionBusy}
                  onClick={() => revokeOne(s.sid, s.current)}
                >
                  بستن این نشست
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">نشست فعالی ثبت نشده است. یک‌بار از سامانه خارج و دوباره وارد شوید تا نشست‌ها دیده شوند.</p>
        )}
        <ActionRow message={sessionMsg} type={sessionMsgType}>
          <button type="button" className="btn-outline" disabled={sessionBusy || sessions.length < 2} onClick={revokeOthers}>
            بستن بقیه جلسات
          </button>
          <button type="button" className="btn-danger" disabled={sessionBusy || !sessions.length} onClick={revokeAll}>
            بستن همه جلسات فعال
          </button>
        </ActionRow>
      </div>
    </div>
  );
}
