"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, roleName } from "@/lib/client";
import { MENU, ROLE_LABELS, ROLES } from "@/lib/constants";
import Feedback from "@/components/Feedback";

const MENU_STORAGE = "rasad-menu";

function MenuIcon({ open }) {
  return open ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ) : (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export default function Shell({ children }) {
  const [user, setUser] = useState(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [shellMsg, setShellMsg] = useState("");
  const [allowDistrictAddApplicant, setAllowDistrictAddApplicant] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    function sync() {
      if (mq.matches) setMenuOpen(localStorage.getItem(MENU_STORAGE) !== "0");
      else setMenuOpen(false);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!menuOpen || window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    Promise.all([
      api("/api/auth/me"),
      api("/api/settings").catch(() => ({ settings: {} })),
      api("/api/status").catch(() => ({ systemEnabled: true })),
    ])
      .then(([d, s, st]) => {
        setUser(d.user);
        setAllowDistrictAddApplicant(Boolean(s.settings?.allowDistrictAddApplicant));
        setSystemEnabled(st.systemEnabled !== false);
        if (d.user && !d.user.activeRole && d.user.roles.length > 1) {
          setRolesOpen(true);
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    api("/api/status")
      .then((st) => setSystemEnabled(st.systemEnabled !== false))
      .catch(() => {});
  }, [path]);

  const items = useMemo(() => {
    if (!user?.activeRole) return [];
    return MENU.filter((m) => {
      if (m.href === "/app/applicants" && user.activeRole === ROLES.district_transfer) {
        return allowDistrictAddApplicant;
      }
      return user.roles.includes("admin") || m.roles.includes(user.activeRole);
    });
  }, [user, allowDistrictAddApplicant]);

  function toggleMenu() {
    setMenuOpen((open) => {
      const next = !open;
      if (window.matchMedia("(min-width: 768px)").matches) {
        localStorage.setItem(MENU_STORAGE, next ? "1" : "0");
      }
      return next;
    });
  }

  function closeMobileMenu() {
    if (!window.matchMedia("(min-width: 768px)").matches) setMenuOpen(false);
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      setShellMsg(err.message || "خروج انجام نشد");
    }
  }

  async function pickRole(role) {
    try {
      const d = await api("/api/auth/select-role", { method: "POST", body: { role } });
      const s = await api("/api/settings").catch(() => ({ settings: {} }));
      setUser(d.user);
      setAllowDistrictAddApplicant(Boolean(s.settings?.allowDistrictAddApplicant));
      setRolesOpen(false);
      setShellMsg("");
      router.refresh();
    } catch (err) {
      setShellMsg(err.message || "انتخاب نقش انجام نشد");
    }
  }

  if (!user) {
    return <div className="p-10 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  const isAdmin = user.roles?.includes("admin");
  if (!systemEnabled && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-6 text-center space-y-4">
          <h1 className="text-xl font-bold">سامانه در حال به‌روزرسانی است</h1>
          <p className="text-sm text-slate-600">لطفاً کمی بعد مراجعه کنید.</p>
          <button className="btn-outline" onClick={logout}>
            خروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {rolesOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-2">انتخاب نقش ورود</h2>
            <p className="text-sm text-slate-500 mb-4">
              حساب شما چند نقش دارد. نقش مورد نظر را انتخاب کنید.
            </p>
            <div className="space-y-2">
              {user.roles.map((r) => (
                <button key={r} className="btn-outline w-full" onClick={() => pickRole(r)}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
              <Feedback message={shellMsg} type="error" />
            </div>
          </div>
        </div>
      )}
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="بستن منو"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={`w-64 shrink-0 bg-[#0f3d5f] text-white flex flex-col fixed inset-y-0 start-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "translate-x-full md:hidden"
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <div className="text-xs opacity-80">اداره کل آموزش و پرورش خراسان رضوی</div>
          <div className="font-bold mt-1">سامانه رصد و پایش درخواست‌ها</div>
          <div className="text-xs mt-2 opacity-80">سرویس رسیدگی به درخواست‌های انتقال</div>
        </div>
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          {items.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={closeMobileMenu}
              className={`block rounded-lg px-3 py-2 text-sm ${
                path === m.href ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 text-xs space-y-2">
          {user.roles.length > 1 && (
            <button className="underline opacity-90" onClick={() => setRolesOpen(true)}>
              تغییر نقش
            </button>
          )}
          <button className="block text-amber-200" onClick={logout}>
            خروج
          </button>
          <Feedback message={shellMsg && !rolesOpen ? shellMsg : ""} type="error" />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#0f3d5f] text-white px-4 py-3 md:bg-white md:text-slate-800 md:border-b">
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10 md:hover:bg-slate-100 shrink-0"
            onClick={toggleMenu}
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menuOpen}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">سامانه رصد و پایش درخواست‌ها</div>
          </div>
          <div className="ms-auto min-w-0 max-w-[50%] text-end">
            <div className="font-medium text-sm truncate">{user.fullName || user.personnelCode}</div>
            <div className="text-[11px] opacity-80 md:text-slate-500 truncate">{roleName(user.activeRole)}</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {!systemEnabled && isAdmin ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              سامانه برای کاربران غیرفعال است. برای فعال‌سازی به تنظیمات بروید.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
