import { useEffect, useState } from 'react';

export const PAGE_SIZES = [10, 25, 50, 100];

function readSize(storageKey) {
  try {
    const v = Number(localStorage.getItem(storageKey));
    return PAGE_SIZES.includes(v) ? v : PAGE_SIZES[0];
  } catch {
    return PAGE_SIZES[0];
  }
}

// Client-side paging over an already-loaded list.
// `storageKey` remembers this screen's rows-per-page choice in the browser;
// `resetKey` changes whenever the filters change, sending you back to page 1
// (editing a row, e.g. changing an order's status, leaves you where you are).
export function usePagination(items, { storageKey, resetKey }) {
  const [pageSize, setPageSizeState] = useState(() => readSize(storageKey));
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [resetKey]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Deleting the last row on the last page shouldn't leave you on an empty page.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  function setPageSize(size) {
    setPageSizeState(size);
    setPage(1);
    try { localStorage.setItem(storageKey, String(size)); } catch { /* storage unavailable */ }
  }

  return { pageItems, page: current, pageCount, pageSize, total, start, setPage, setPageSize };
}

// 1 … 4 5 [6] 7 8 … 20 — always first/last, plus neighbours of the current page.
function pageNumbers(page, pageCount) {
  const nums = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => nums.add(n));
  if (page >= pageCount - 2) [pageCount - 1, pageCount - 2, pageCount - 3].forEach((n) => nums.add(n));
  const sorted = [...nums].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

export default function Pagination({ pager, label = 'rows' }) {
  const { page, pageCount, pageSize, total, start, setPage, setPageSize } = pager;
  if (total === 0) return null;
  const end = Math.min(start + pageSize, total);
  const go = (n) => {
    setPage(n);
    document.getElementById('main')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="elg-pagination" role="navigation" aria-label="Pagination">
      <div className="elg-pagination-info">
        <span className="elg-pagination-showing">Showing </span><strong>{start + 1}–{end}</strong> of <strong>{total}</strong> <span className="elg-pagination-label">{label}</span>
      </div>
      <div className="elg-pagination-controls">
        <label className="elg-pagination-size">
          <span><span className="elg-pagination-showing">Rows per page</span><span className="elg-pagination-short">Rows</span></span>
          <select className="elg-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {pageCount > 1 && (
          <div className="elg-pagination-pages">
            <button type="button" className="elg-page-btn" onClick={() => go(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
            {pageNumbers(page, pageCount).map((n) => (typeof n === 'string'
              ? <span key={n} className="elg-page-gap">…</span>
              : (
                <button
                  type="button"
                  key={n}
                  className={`elg-page-btn ${n === page ? 'active' : ''}`}
                  onClick={() => go(n)}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </button>
              )))}
            <button type="button" className="elg-page-btn" onClick={() => go(page + 1)} disabled={page === pageCount} aria-label="Next page">›</button>
          </div>
        )}
      </div>
      {/* Phones: one big, thumb-friendly Prev · Page X of Y · Next row instead of page numbers. */}
      {pageCount > 1 && (
        <div className="elg-pagination-compact">
          <button type="button" className="elg-page-btn" onClick={() => go(page - 1)} disabled={page === 1}>‹ Prev</button>
          <span className="elg-pagination-compact-label">Page <strong>{page}</strong> of <strong>{pageCount}</strong></span>
          <button type="button" className="elg-page-btn" onClick={() => go(page + 1)} disabled={page === pageCount}>Next ›</button>
        </div>
      )}
    </div>
  );
}
