"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { ROLE_LABELS, UNKNOWN_USER_MESSAGE } from "@/lib/constants";
import Feedback from "@/components/Feedback";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState("mobile");
  const [method, setMethod] = useState("otp");
  const [passwordLogin, setPasswordLogin] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [dev, setDev] = useState("");
  const [roles, setRoles] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/status")
      .then((d) => {
        setPasswordLogin(Boolean(d.allowPasswordLogin));
        setSystemEnabled(d.systemEnabled !== false);
      })
      .catch(() => {
        setPasswordLogin(false);
        setSystemEnabled(true);
      });
  }, []);

  async function afterLogin(d) {
    if (d.needRole) {
      setRoles(d.user.roles);
      setStep("role");
      setMsgType("success");
      setMsg("ورود موفق بود. نقش خود را انتخاب کنید.");
    } else {
      router.push("/app");
      router.refresh();
    }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/api/auth/send-otp", { method: "POST", body: { mobile } });
      setStep("otp");
      setDev(d.devCode || "");
      setMsgType("success");
      setMsg(d.devCode ? "کد تایید آماده است" : "کد تایید به شماره همراه شما ارسال شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.data?.message || err.message || UNKNOWN_USER_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/api/auth/verify-otp", { method: "POST", body: { mobile, code } });
      await afterLogin(d);
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loginWithPassword(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/api/auth/password", { method: "POST", body: { mobile, password } });
      await afterLogin(d);
    } catch (err) {
      setMsgType("error");
      setMsg(err.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pick(role) {
    setMsg("");
    try {
      await api("/api/auth/select-role", { method: "POST", body: { role } });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  function switchMethod(next) {
    setMethod(next);
    setStep("mobile");
    setCode("");
    setPassword("");
    setMsg("");
    setDev("");
  }

  return (
    <div className="card p-6 w-full self-stretch flex flex-col">
      <h2 className="text-xl font-bold mb-1">ورود به سامانه</h2>
      {!systemEnabled ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          سامانه در حال به‌روزرسانی است. ورود فقط برای مدیر سیستم امکان‌پذیر است.
        </div>
      ) : null}
      <p className="text-sm text-slate-500 mb-5">
        {method === "password" && passwordLogin
          ? "ورود با شماره همراه و رمز عبور"
          : "ورود با شماره همراه و کد یکبارمصرف"}
      </p>

      {passwordLogin && step !== "role" ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            className={method === "otp" ? "btn-primary" : "btn-outline"}
            onClick={() => switchMethod("otp")}
          >
            ورود با پیامک
          </button>
          <button
            type="button"
            className={method === "password" ? "btn-primary" : "btn-outline"}
            onClick={() => switchMethod("password")}
          >
            ورود با رمز عبور
          </button>
        </div>
      ) : null}

      {step === "mobile" && method === "otp" && (
        <form onSubmit={sendOtp} className="space-y-3">
          <label className="label">شماره همراه</label>
          <input
            className="input"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="09xxxxxxxxx"
            dir="ltr"
          />
          <button className="btn-primary w-full" disabled={busy}>
            ارسال کد تایید
          </button>
          <Feedback message={msg} type={msgType} />
        </form>
      )}

      {step === "mobile" && method === "password" && passwordLogin && (
        <form onSubmit={loginWithPassword} className="space-y-3">
          <label className="label">شماره همراه</label>
          <input
            className="input"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="09xxxxxxxxx"
            dir="ltr"
          />
          <label className="label">رمز عبور</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            dir="ltr"
          />
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "در حال ورود..." : "ورود"}
          </button>
          <Feedback message={msg} type={msgType} />
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verify} className="space-y-3">
          <label className="label">کد پیامکی</label>
          <input
            className="input text-center tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={5}
            dir="ltr"
          />
          {dev ? <p className="text-xs text-amber-700">کد آزمایشی: {dev}</p> : null}
          <button className="btn-primary w-full" disabled={busy}>
            ورود
          </button>
          <button type="button" className="btn-outline w-full" onClick={() => setStep("mobile")}>
            تغییر شماره
          </button>
          <Feedback message={msg} type={msgType} />
        </form>
      )}

      {step === "role" && (
        <div className="space-y-2">
          <p className="text-sm mb-2">نقش ورود را انتخاب کنید:</p>
          {roles.map((r) => (
            <button key={r} className="btn-outline w-full" onClick={() => pick(r)}>
              {ROLE_LABELS[r]}
            </button>
          ))}
          <Feedback message={msg} type={msgType} />
        </div>
      )}

      {!passwordLogin ? (
        <div className="mt-auto pt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
          ورود با رمز عبور از تنظیمات سامانه غیرفعال است.
        </div>
      ) : (
        <p className="mt-auto pt-4 text-xs text-slate-400">
          رمز عبور را می‌توانید پس از ورود، از صفحه پروفایل تعیین یا تغییر دهید.
        </p>
      )}
    </div>
  );
}
