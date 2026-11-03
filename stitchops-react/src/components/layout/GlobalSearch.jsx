import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { api } from '../../lib/api';


// Reuse the exact same icons already used for these sections in the sidebar,
// so a search result looks like it belongs to the same nav item it links to.
const GROUP_ICONS = {
  Customers: '/icons/customer-icon.svg',
  Orders: '/icons/orders-icon.svg',
  Invoices: '/icons/invoices-icon.svg',
  Employees: '/icons/employees-icon.svg'
};

// Order matches the results order — Orders last since that group tends to be
// the largest.
const TAGS = ['customers', 'employees', 'invoices', 'orders'];
const TAG_LABEL = { customers: 'Customers', employees: 'Employees', invoices: 'Invoices', orders: 'Orders' };


// Two-stage glide: slide sideways along the top bar to the centre, then
// move down into place. SLIDE_SHARE = fraction of the time spent sliding.
const MOVE_MS = 620;
const CLOSE_MS = 520;
const SLIDE_SHARE = 0.5;
const SLIDE_EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';
const DROP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const COLLAPSE_MS = 220;

// The header search field, when it's actually on screen (desktop layout).
function headerField() {
  const el = document.querySelector('.elg-topbar .elg-search');
  if (!el || !el.offsetParent) return null;
  return el.getBoundingClientRect().width > 0 ? el : null;
}

const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Visual state of the header field vs. the open panel, for the glide.
function frame(el, rect, extra) {
  const cs = getComputedStyle(el);
  return {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: cs.borderRadius,
    backgroundColor: cs.backgroundColor,
    ...extra
  };
}

export default function GlobalSearch() {
  const { isAdmin } = useAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  // Desktop glide: the panel starts where the header field is, travels to the
  // centre, then drops its results open. `flip` = this open uses the glide;
  // `expanded` = results are dropped open.
  const [flip, setFlip] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const openRef = useRef(false);
  const busyRef = useRef(false);
  // Mirrors `flip` for the keyboard listener, which is registered once and
  // would otherwise see a stale value.
  const flipRef = useRef(false);
  const [q, setQ] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const basePath = isAdmin ? '/customers' : '/my-customers';

  function openSearch() {
    if (openRef.current || busyRef.current) return;
    openRef.current = true;
    const glide = Boolean(headerField()) && !prefersReducedMotion();
    flipRef.current = glide;
    setFlip(glide);
    setExpanded(!glide);
    setClosing(false);
    setOpen(true);
  }

  // Runs right after the panel mounts at its final (centred) position, before
  // the browser paints, so both ends can be measured and the glide starts
  // exactly on the header field with no visible jump.
  useLayoutEffect(() => {
    if (!open || !flip) return undefined;
    const field = headerField();
    const panel = panelRef.current;
    if (!field || !panel) { setExpanded(true); return undefined; }
    const from = field.getBoundingClientRect();
    const to = panel.getBoundingClientRect();
    const end = frame(panel, to, { transform: 'translate(0, 0)', boxShadow: getComputedStyle(panel).boxShadow });
    // The overlay centres the panel, so at the header field's (narrower) width
    // its box sits further right by half the difference — compensate for it.
    const centreShift = (to.width - from.width) / 2;
    const dy = from.top - to.top;
    const start = frame(field, from, {
      transform: `translate(${from.left - to.left - centreShift}px, ${dy}px)`,
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06)',
      easing: SLIDE_EASE
    });
    // Stage 1 ends here: horizontally centred, still sitting in the top bar.
    const mid = frame(field, { width: to.width, height: from.height }, {
      transform: `translate(0px, ${dy}px)`,
      boxShadow: '0 4px 14px rgba(20, 20, 40, 0.08)',
      offset: SLIDE_SHARE,
      easing: DROP_EASE
    });
    field.classList.add('elg-search-lifted');
    busyRef.current = true;
    const move = panel.animate([start, mid, end], { duration: MOVE_MS });
    overlayRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS, easing: 'ease-out' });
    // `finish` fires on the next painted frame; the timer is a backup for
    // background tabs (no frames) so the results always drop open.
    let done = false;
    const afterMove = () => {
      if (done) return;
      done = true;
      busyRef.current = false;
      setExpanded(true);
    };
    move.onfinish = afterMove;
    const backup = setTimeout(afterMove, MOVE_MS + 120);
    return () => { clearTimeout(backup); move.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flip]);

  useEffect(() => {
    function onKeyDown(e) {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        if (openRef.current) closeSearch(); else openSearch();
      } else if (e.key === 'Escape' && openRef.current) {
        closeSearch();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onOpenRequest() { openSearch(); }
    window.addEventListener('open-global-search', onOpenRequest);
    return () => window.removeEventListener('open-global-search', onOpenRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActiveTag(null);
      setActiveIndex(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]);

  // While typing "/…" with no tag committed yet, offer matching category tags.
  const tagSuggestions = !activeTag && q.startsWith('/')
    ? TAGS.filter((t) => t.startsWith(q.slice(1).trim().toLowerCase()))
    : [];

  function commitTag(tag) {
    setActiveTag(tag);
    setQ('');
    setActiveIndex(0);
    if (inputRef.current) inputRef.current.focus();
  }

  function handleQueryChange(raw) {
    // Typing a space right after a "/tag" that uniquely matches one category
    // commits it immediately — mirrors how Slack/Linear-style "/" commands work.
    if (!activeTag && raw.startsWith('/') && raw.endsWith(' ')) {
      const typed = raw.slice(1, -1).trim().toLowerCase();
      const candidates = TAGS.filter((t) => t.startsWith(typed));
      if (typed && candidates.length === 1) {
        commitTag(candidates[0]);
        return;
      }
    }
    setQ(raw);
    setActiveIndex(0);
  }

  function finishClose() {
    document.querySelectorAll('.elg-search-lifted').forEach((el) => el.classList.remove('elg-search-lifted'));
    openRef.current = false;
    busyRef.current = false;
    setOpen(false);
    setClosing(false);
    flipRef.current = false;
    setFlip(false);
    setExpanded(false);
  }

  function closeSearch() {
    if (!openRef.current || busyRef.current) return;
    const panel = panelRef.current;
    const field = document.querySelector('.elg-search-lifted') || headerField();
    const canGlide = flipRef.current && panel && field && field.getBoundingClientRect().width > 0 && !prefersReducedMotion();
    busyRef.current = true;
    if (!canGlide) {
      setClosing(true);
      setTimeout(finishClose, 160);
      return;
    }
    // Reverse: fold the results up, then glide back into the header field.
    setExpanded(false);
    setTimeout(() => {
      const from = panel.getBoundingClientRect();
      const to = field.getBoundingClientRect();
      const start = frame(panel, from, { transform: 'translate(0, 0)', boxShadow: getComputedStyle(panel).boxShadow });
      const centreShift = (from.width - to.width) / 2;
      const dy = to.top - from.top;
      start.easing = SLIDE_EASE;
      // Rise back up to the top bar first (still centred), then slide home.
      const mid = frame(field, { width: from.width, height: to.height }, {
        transform: `translate(0px, ${dy}px)`,
        boxShadow: '0 4px 14px rgba(20, 20, 40, 0.08)',
        offset: 1 - SLIDE_SHARE,
        easing: SLIDE_EASE
      });
      const end = frame(field, to, {
        transform: `translate(${to.left - from.left - centreShift}px, ${dy}px)`,
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06)'
      });
      const back = panel.animate([start, mid, end], { duration: CLOSE_MS, fill: 'forwards' });
      overlayRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards' });
      let done = false;
      const afterBack = () => { if (!done) { done = true; finishClose(); } };
      back.onfinish = afterBack;
      setTimeout(afterBack, CLOSE_MS + 120);
    }, COLLAPSE_MS);
  }

  function clearTag() {
    setActiveTag(null);
    setQ('');
    setActiveIndex(0);
  }

  // Results come from the server (same matching rules, 5 per group), so the
  // browser never needs every customer/order/invoice to search them.
  const [serverGroups, setServerGroups] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  useEffect(() => {
    const query = q.trim();
    if (!open || (!query && !activeTag)) { setServerGroups([]); setSearching(false); return undefined; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (activeTag) params.set('tag', activeTag);
      api.get(`/search?${params.toString()}`)
        .then((r) => { if (seq === searchSeq.current) setServerGroups(r.groups); })
        .catch(() => { if (seq === searchSeq.current) setServerGroups([]); })
        .finally(() => { if (seq === searchSeq.current) setSearching(false); });
    }, 150);
    return () => clearTimeout(t);
  }, [q, activeTag, open]);

  const groups = useMemo(() => serverGroups.map((g) => ({
    key: g.key,
    label: TAG_LABEL[g.key],
    items: g.items.map((x) => {
      if (g.key === 'customers') return { key: `customer-${x.id}`, title: x.company, subtitle: [x.customerCode, x.name].filter(Boolean).join(' · '), go: () => navigate(`${basePath}/${x.id}`) };
      if (g.key === 'employees') return { key: `employee-${x.id}`, title: x.name, subtitle: [x.role, x.designation].filter(Boolean).join(' · '), go: () => navigate(`/employees/${x.id}`) };
      if (g.key === 'invoices') return { key: `invoice-${x.id}`, title: x.invoiceNo, subtitle: [x.customerCompany, x.paymentStatus].filter(Boolean).join(' · '), go: () => navigate(`${basePath}/${x.customerId}`) };
      return { key: `order-${x.id}`, title: x.name, subtitle: [x.customerCompany, x.date, x.status].filter(Boolean).join(' · '), go: () => navigate(`${basePath}/${x.customerId}`) };
    })
  })), [serverGroups, basePath, navigate]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function select(item) {
    item.go();
    closeSearch();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSuggestions.length === 1) { commitTag(tagSuggestions[0]); return; }
      if (flatItems[activeIndex]) select(flatItems[activeIndex]);
    } else if (e.key === 'Backspace' && activeTag && q === '') {
      e.preventDefault();
      clearTag();
    }
  }

  if (!open) return null;

  let runningIndex = -1;
  const showingTagMenu = tagSuggestions.length > 0;

  return (
    <div ref={overlayRef} className={`elg-search-overlay ${closing ? 'closing' : ''} ${flip ? 'elg-search-flip-overlay' : ''}`} onClick={closeSearch}>
      <div
        ref={panelRef}
        className={`elg-search-panel ${closing ? 'closing' : ''} ${flip ? 'elg-search-flip' : ''} ${expanded ? 'expanded' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="elg-search-bar">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          {activeTag && (
            <span className="elg-search-tag-chip">
              /{TAG_LABEL[activeTag]}
              <button type="button" className="elg-search-tag-chip-remove" onClick={clearTag} title="Remove filter" aria-label="Remove filter">×</button>
            </span>
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTag ? `Search ${TAG_LABEL[activeTag].toLowerCase()}…` : 'Search customers, orders, invoices, employees, or type "/" to filter…'}
          />
          <button className="elg-search-bar-close" onClick={closeSearch} title="Close" aria-label="Close">
            <img src="/icons/model-close-icon.svg" alt="" width={16} height={16} />
          </button>
        </div>

        <div className="elg-search-drop">
        <div className="elg-search-drop-inner">
        {showingTagMenu ? (
          <div className="elg-search-results">
            <div className="elg-search-group-label">Filter by</div>
            {tagSuggestions.map((tag) => (
              <div key={tag} className="elg-search-row" onClick={() => commitTag(tag)}>
                <span className="elg-search-row-icon"><img src={GROUP_ICONS[TAG_LABEL[tag]]} alt="" /></span>
                <span className="elg-search-row-text">
                  <span className="elg-search-row-title elg-search-tag-suggestion">/{TAG_LABEL[tag]}</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="elg-search-results">
            {q.trim() === '' && !activeTag && (
              <div className="elg-search-empty">Start typing to search across customers, orders, invoices and employees.</div>
            )}
            {(q.trim() !== '' || activeTag) && flatItems.length === 0 && (
              <div className="elg-search-empty">{searching ? 'Searching…' : `No matches${q ? ` for "${q}"` : ''}.`}</div>
            )}
            {groups.map((group) => (
              <div className="elg-search-group" key={group.label}>
                <div className="elg-search-group-label">{group.label}</div>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  return (
                    <div
                      key={item.key}
                      className={`elg-search-row ${isActive ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(runningIndex)}
                      onClick={() => select(item)}
                    >
                      <span className="elg-search-row-icon"><img src={GROUP_ICONS[group.label]} alt="" /></span>
                      <span className="elg-search-row-text">
                        <span className="elg-search-row-title">{item.title}</span>
                        {item.subtitle && <span className="elg-search-row-subtitle">{item.subtitle}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}
