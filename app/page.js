import AnnouncementDates from "@/components/AnnouncementDates";
import ZoomableImage from "@/components/ZoomableImage";
import LoginForm from "@/components/LoginForm";
import {
  announcementVisibleFilter,
  ANNOUNCEMENT_SORT,
} from "@/lib/announcements";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Announcement from "@/models/Announcement";

export const dynamic = "force-dynamic";

function ServiceLamp({ on }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        on ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-red-500"}`}
      />
      {on ? "فعال" : "غیرفعال"}
    </span>
  );
}

export default async function Home() {
  await connectDB();
  const settings = await getSettings();
  const services = (settings.services || []).filter((s) => s.visible !== false);
  const announcements = await Announcement.find({
    isPublic: true,
    ...announcementVisibleFilter(),
  })
    .sort(ANNOUNCEMENT_SORT)
    .limit(8)
    .lean();
  const headerLine =
    services.length === 1
      ? `سرویس سامانه : ${services[0].title}`
      : services.length > 1
        ? `سرویس‌های سامانه : ${services.map((s) => s.title).join("، ")}`
        : "";

  return (
    <div className="flex-1 bg-[linear-gradient(180deg,#0f3d5f_0%,#0f3d5f_140px,#f4f7fb_140px)]">
      <header className="text-white px-6 py-6 max-w-5xl mx-auto flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-light text-white/55">
            وزارت آموزش و پرورش
          </p>
          <p className="text-xs font-light mt-0.5 text-white/70">
            اداره کل آموزش و پرورش خراسان رضوی
          </p>
          <h1 className="mt-3 text-xl md:text-2xl font-semibold">
            سامانه رصد و پایش درخواست‌ها
          </h1>
          {/* {headerLine ? <p className="mt-2 text-sm font-normal opacity-90">{headerLine}</p> : null} */}
        </div>
        <img
          src="/ministry-education-logo.png"
          alt="اداره کل آموزش و پرورش خراسان رضوی"
          className="h-16 md:h-24 w-auto bg-white rounded-md p-1 object-contain shrink-0"
        />
      </header>
      <div
        className={`max-w-5xl mx-auto px-6 pb-12 grid gap-6 items-stretch mt-8 ${
          services.length ? "md:grid-cols-2" : ""
        }`}
      >
        <LoginForm />
        {services.length ? (
          <div className="space-y-4">
            {services.map((s) => (
              <div key={s.id} className="card p-6 self-stretch">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold leading-7">
                    {s.enabled !== false ? "سرویس فعال" : "سرویس"} : {s.title}
                  </h3>
                  <ServiceLamp on={s.enabled !== false} />
                </div>
                {s.description ? (
                  <p className="text-sm leading-7 text-slate-600 whitespace-pre-line">
                    {s.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {announcements.length ? (
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">اطلاعیه‌ها</h2>
            {announcements.map((n) => (
              <div
                key={String(n._id)}
                className="card p-5 border-r-4 border-r-[#c9a227]"
              >
                <div className="font-semibold">{n.title}</div>
                <AnnouncementDates item={n} />
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-7">
                  {n.body}
                </p>
                {n.imageUrl ? (
                  <ZoomableImage
                    src={n.imageUrl}
                    alt={n.imageName || n.title || ""}
                    className="max-h-72 w-full object-contain rounded-lg bg-slate-50"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
