"use client";

import { useState } from "react";
import { toFaDigits } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";

function pageWindow(page, pages, width = 5) {
  if (pages <= width) return Array.from({ length: pages }, (_, i) => i + 1);
  let start = Math.max(1, page - Math.floor(width / 2));
  let end = start + width - 1;
  if (end > pages) {
    end = pages;
    start = Math.max(1, end - width + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  const safePages = Math.max(1, pages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safePages);
  const safeLimit = limit || 20;
  const from = total ? (safePage - 1) * safeLimit + 1 : 0;
  const to = Math.min(total || 0, safePage * safeLimit);
  const nums = pageWindow(safePage, safePages);

  if (!total && safePages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm">
      <div className="text-slate-600">
        {total
          ? `نمایش ${toFaDigits(from)} تا ${toFaDigits(to)} از ${toFaDigits(total)} مورد`
          : "موردی یافت نشد"}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className="btn-outline !px-3"
          disabled={safePage <= 1}
          onClick={() => onPage(safePage - 1)}
        >
          قبلی
        </button>
        {nums[0] > 1 ? (
          <>
            <button type="button" className="btn-outline !px-3" onClick={() => onPage(1)}>
              {toFaDigits(1)}
            </button>
            {nums[0] > 2 ? <span className="px-1 text-slate-400">…</span> : null}
          </>
        ) : null}
        {nums.map((n) => (
          <button
            type="button"
            key={n}
            className={n === safePage ? "btn-primary !px-3" : "btn-outline !px-3"}
            onClick={() => onPage(n)}
          >
            {toFaDigits(n)}
          </button>
        ))}
        {nums[nums.length - 1] < safePages ? (
          <>
            {nums[nums.length - 1] < safePages - 1 ? (
              <span className="px-1 text-slate-400">…</span>
            ) : null}
            <button type="button" className="btn-outline !px-3" onClick={() => onPage(safePages)}>
              {toFaDigits(safePages)}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn-outline !px-3"
          disabled={safePage >= safePages}
          onClick={() => onPage(safePage + 1)}
        >
          بعدی
        </button>
      </div>
      <label className="flex items-center gap-2 text-slate-600">
        در هر صفحه
        <select
          className="input !w-auto"
          value={safeLimit}
          onChange={(e) => onLimit(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function useClientPaging(rows, defaultLimit = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const total = rows?.length || 0;
  const pages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, pages);
  return {
    slice: (rows || []).slice((safePage - 1) * limit, safePage * limit),
    page: safePage,
    pages,
    total,
    limit,
    onPage: setPage,
    onLimit: (value) => {
      setLimit(value);
      setPage(1);
    },
  };
}
