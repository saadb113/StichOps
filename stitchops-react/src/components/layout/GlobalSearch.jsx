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

function matches(q, ...fields) {
  return fields.some((f) => f && String(f).toLowerCase().startsWith(q));
}

export default function GlobalSearch() {
  const { customers, orders, invoices, employees, isAdmin, getCustomer } = useAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
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
        setOpen(false);
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
      setActiveIndex(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];

    const customerHits = customers
      .filter((c) => matches(query, c.name, c.company, c.customerCode, c.email))
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
        .filter((e) => matches(query, e.name, e.email, e.designation))
        .slice(0, MAX_PER_GROUP)
        .map((e) => ({
          key: `employee-${e.id}`,
          title: e.name,
          subtitle: [e.role, e.designation].filter(Boolean).join(' · '),
          go: () => navigate(`/employees/${e.id}`)
        }))
      : [];

    return [
      { label: 'Customers', items: customerHits },
      { label: 'Employees', items: employeeHits },
      { label: 'Orders', items: orderHits },
      { label: 'Invoices', items: invoiceHits }
    ].filter((g) => g.items.length);
  }, [q, customers, orders, invoices, employees, isAdmin, basePath, navigate, getCustomer]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function select(item) {
    item.go();
    setOpen(false);
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
      if (flatItems[activeIndex]) select(flatItems[activeIndex]);
    }
  }

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="elg-search-overlay" onClick={() => setOpen(false)}>
      <div className="elg-search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="elg-search-bar">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, orders, invoices, employees…"
          />
          <button className="elg-search-bar-close" onClick={() => setOpen(false)} title="Close" aria-label="Close">
            <img src="/icons/model-close-icon.svg" alt="" width={16} height={16} />
          </button>
        </div>

        <div className="elg-search-results">
          {q.trim() === '' && (
            <div className="elg-search-empty">Start typing to search across customers, orders, invoices and employees.</div>
          )}
          {q.trim() !== '' && flatItems.length === 0 && (
            <div className="elg-search-empty">No matches for "{q}".</div>
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
      </div>
    </div>
  );
}
