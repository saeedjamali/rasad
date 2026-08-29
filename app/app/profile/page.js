"use client";

import { useEffect, useState } from "react";
import { api, roleName } from "@/lib/client";
import Feedback from "@/components/Feedback";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/auth/me"), api("/api/settings").catch(() => ({ settings: {} }))])
      .then(([d, s]) => {
        setUser(d.user);
        setAllowPasswordLogin(Boolean(s.settings?.allowPasswordLogin));
      })
      .catch(() => {});
  }, []);

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

  if (!user) return null;
  return (
    <div className="max-w-lg space-y-4">
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
    </div>
  );
}
