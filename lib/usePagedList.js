"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export function usePagedList() {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const apply = useCallback((d, fallbackPage = 1, fallbackLimit = DEFAULT_PAGE_SIZE) => {
    const rows = d.list || [];
    const tot = d.total ?? rows.length;
    const lim = d.limit ?? fallbackLimit;
    const pgs = d.pages ?? Math.max(1, Math.ceil((tot || 0) / lim) || 1);
    setList(rows);
    setTotal(tot);
    setLimit(lim);
    setPages(pgs);
    setPage(d.page ?? fallbackPage);
    return { rows, page: d.page ?? fallbackPage, limit: lim, total: tot, pages: pgs };
  }, []);

  const loadUrl = useCallback(
    async (url, nextPage, nextLimit) => {
      const d = await api(url);
      const applied = apply(d, nextPage, nextLimit);
      if (applied.rows.length === 0 && applied.page > 1 && applied.total > 0) {
        return null;
      }
      return d;
    },
    [apply]
  );

  return { list, setList, page, limit, total, pages, apply, loadUrl, setPage, setLimit };
}
