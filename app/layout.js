import localFont from "next/font/local";
import "./globals.css";
import { FOOTER_TEXT } from "@/lib/constants";

const vazir = localFont({
  src: "./fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazir",
  display: "swap",
  weight: "100 900",
});

export const metadata = {
  title: " رصد | آموزش و پرورش خراسان رضوی",
  description: "سرویس رسیدگی به درخواست‌های انتقال",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${vazir.className} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="text-center text-xs text-slate-500 py-3 border-t bg-white">
          {FOOTER_TEXT}
          <span className="mx-2">|</span>
          rasad.razaviedu.ir
        </footer>
      </body>
    </html>
  );
}
