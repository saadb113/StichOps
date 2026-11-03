import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { PAGE_SIZES } from '../components/common/Pagination';

function readSize(storageKey) {
  try {
    const v = Number(localStorage.getItem(storageKey));
    return PAGE_SIZES.includes(v) ? v : PAGE_SIZES[0];
  } catch {
    return PAGE_SIZES[0];
  }
}

const SEARCH_DEBOUNCE_MS = 250;

// Fetches one page of a list from the server (`GET path?page=…&pageSize=…&filters`).
// - `filters`: the screen's filter values; changing any of them goes back to page 1.
// - `version`: bump it to refetch the current page (after a save, a live update…).
// Returns the rows plus a `pager` with the same shape <Pagination> expects.
export function useServerList(path, filters, { storageKey, version = 0 }) {
  const [pageSize, setPageSizeState] = useState(() => readSize(storageKey));
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  // Filters changed → back to page 1. Uses React's "adjust state during
  // render" pattern, so we never fetch e.g. page 7 of a 1-page search.
  const filterKey = JSON.stringify(filters);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  const effectivePage = prevFilterKey !== filterKey ? 1 : page;

  const search = filters.search || '';
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    if (search === debouncedSearch) return undefined;
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const queryFilters = { ...filters, search: debouncedSearch };
  const qs = new URLSearchParams({ page: String(effectivePage), pageSize: String(pageSize) });
  Object.entries(queryFilters).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) qs.set(k, String(v)); });
  const url = `${path}?${qs.toString()}`;

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    api.get(url)
      .then((res) => {
        // A slower, older request must never overwrite a newer one.
        if (seq !== requestSeq.current) return;
        setData(res);
        setError(null);
      })
      .catch((e) => { if (seq === requestSeq.current) setError(e); })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  }, [url, version]);

  function setPageSize(size) {
    setPageSizeState(size);
    setPage(1);
    try { localStorage.setItem(storageKey, String(size)); } catch { /* storage unavailable */ }
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(effectivePage, pageCount);
  const pager = {
    pageItems: data?.items ?? [],
    page: current,
    pageCount,
    pageSize,
    total,
    start: (current - 1) * pageSize,
    setPage,
    setPageSize
  };

  return {
    items: data?.items ?? [],
    total,
    stats: data?.stats ?? null,
    extra: data ?? {},
    // First load (no data yet) shows skeletons; later loads keep the current
    // rows on screen and just dim them, so paging never flashes.
    initialLoading: !data && !error,
    refreshing: loading && !!data,
    error,
    pager
  };
}
