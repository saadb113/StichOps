import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

const MAX_PER_GROUP = 5;

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

function matches(q, ...fields) {
  return fields.some((f) => f && String(f).toLowerCase().startsWith(q));
}

export default function GlobalSearch() {
  const { customers, orders, invoices, employees, isAdmin, getCustomer } = useAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [q, setQ] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const basePath = isAdmin ? '/customers' : '/my-customers';

  useEffect(() => {
    function onKeyDown(e) {
      const isK = e.key.toLowerCase() === 'k';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onOpenRequest() { setOpen(true); }
    window.addEventListener('open-global-search', onOpenRequest);
    return () => window.removeEventListener('open-global-search', onOpenRequest);
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

  function closeSearch() {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 160);
  }

  function clearTag() {
    setActiveTag(null);
    setQ('');
    setActiveIndex(0);
  }

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query && !activeTag) return [];

    const customerHits = customers
      .filter((c) => matches(query, c.company))
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({
        key: `customer-${c.id}`,
        title: c.company,
        subtitle: [c.customerCode, c.name].filter(Boolean).join(' · '),
        go: () => navigate(`${basePath}/${c.id}`)
      }));

    const orderHits = orders
      .filter((o) => matches(query, o.name))
      .slice(0, MAX_PER_GROUP)
      .map((o) => {
        const cust = getCustomer(o.customerId);
        return {
          key: `order-${o.id}`,
          title: o.name,
          subtitle: [cust ? cust.company : null, o.date, o.status].filter(Boolean).join(' · '),
          go: () => navigate(`${basePath}/${o.customerId}`)
        };
      });

    const invoiceHits = isAdmin
      ? invoices
        .filter((i) => matches(query, i.invoiceNo))
        .slice(0, MAX_PER_GROUP)
        .map((i) => {
          const cust = getCustomer(i.customerId);
          return {
            key: `invoice-${i.id}`,
            title: i.invoiceNo,
            subtitle: [cust ? cust.company : null, i.paymentStatus].filter(Boolean).join(' · '),
            go: () => navigate(`${basePath}/${i.customerId}`)
          };
        })
      : [];

    const employeeHits = isAdmin
      ? employees
        .filter((e) => matches(query, e.name))
        .slice(0, MAX_PER_GROUP)
        .map((e) => ({
          key: `employee-${e.id}`,
          title: e.name,
          subtitle: [e.role, e.designation].filter(Boolean).join(' · '),
          go: () => navigate(`/employees/${e.id}`)
        }))
      : [];

    const allGroups = [
      { label: 'Customers', key: 'customers', items: customerHits },
      { label: 'Employees', key: 'employees', items: employeeHits },
      { label: 'Invoices', key: 'invoices', items: invoiceHits },
      { label: 'Orders', key: 'orders', items: orderHits }
    ];

    return (activeTag ? allGroups.filter((g) => g.key === activeTag) : allGroups).filter((g) => g.items.length);
  }, [q, activeTag, customers, orders, invoices, employees, isAdmin, basePath, navigate, getCustomer]);

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
    <div className={`elg-search-overlay ${closing ? 'closing' : ''}`} onClick={closeSearch}>
      <div className={`elg-search-panel ${closing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
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
              <div className="elg-search-empty">No matches{q ? ` for "${q}"` : ''}.</div>
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
  );
}
