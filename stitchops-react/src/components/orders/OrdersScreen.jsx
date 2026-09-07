import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { commissionAmt } from '../../lib/helpers';
import { SYM, TODAY, ORDER_STATUSES, CUSTOMER_CURRENCIES } from '../../lib/constants';
import OrderFormModal from './OrderFormModal';
import ConfirmDeleteOrderModal from './ConfirmDeleteOrderModal';
import { SearchIcon, CalendarIcon, PencilIcon, KebabIcon, PlusIcon } from '../icons/Icon';

function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'In progress') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function OrdersScreen() {
  const { orders, getCustomer, setOrderStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  let list = orders.slice();
  if (from) list = list.filter((o) => o.date >= from);
  if (to) list = list.filter((o) => o.date <= to);
  if (currency) list = list.filter((o) => o.currency === currency);
  if (status) list = list.filter((o) => o.status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((o) => {
      const c = getCustomer(o.customerId);
      return o.name.toLowerCase().startsWith(q) || (c && (c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
    });
  }
  list = list.sort((a, b) => b.date.localeCompare(a.date));

  // Starting a fresh search clears the date range so results aren't
  // silently narrowed to whatever range happens to be selected — matching
  // orders from every date show up. Picking a range afterward re-applies it
  // on top of the search.
  function handleSearchChange(v) {
    if (v && !search) { setFrom(''); setTo(''); }
    setSearch(v);
  }

  function handleDelete(o) {
    setOpenMenuId(null);
    openModal(<ConfirmDeleteOrderModal order={o} />, { variant: 'elegant' });
  }

  function cycleStatus(o) {
    const idx = ORDER_STATUSES.indexOf(o.status);
    const next = ORDER_STATUSES[(idx + 1) % ORDER_STATUSES.length];
    setOrderStatus(o.id, next).catch((err) => toast(err.message));
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Orders</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Orders</div>
          <div className="elg-page-sub">{list.length} order{list.length === 1 ? '' : 's'} listed</div>
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search order or customer" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="elg-date-range-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          <span style={{ color: 'var(--elg-ink-3)', fontSize: 13 }}>to</span>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          {(from || to) && <button className="elg-date-clear" title="Clear dates" onClick={() => { setFrom(''); setTo(''); }}>&times;</button>}
        </div>
        <select className="elg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="">All Currencies</option>
          {CUSTOMER_CURRENCIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
          <PlusIcon /> Add Order
        </button>
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Status</th><th>Currency</th><th>Price</th><th>Commission</th><th style={{minWidth : "150px"}}>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} className="elg-empty">No orders match these filters.</td></tr>}
            {list.map((o) => {
              const c = getCustomer(o.customerId);
              return (
                <tr key={o.id} className="clickable">
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{o.date}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{o.name}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{c ? c.company : '—'}</td>
                  <td><span className={`elg-badge clickable ${elgStatusClass(o.status)}`} onClick={() => cycleStatus(o)} title="Click to advance status">{o.status}</span></td>
                  <td>{o.currency} {SYM[o.currency]}</td>
                  <td>{o.price.toFixed(2)}</td>
                  <td>{commissionAmt(o).toFixed(2)} <span className="elg-comm-pct">({o.commissionRate}%)</span></td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="Edit" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}><img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /></button>
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                      {openMenuId === o.id && (
                        <div className="elg-row-menu">
                          <button className="elg-btn-danger-text" onClick={() => handleDelete(o)}>Delete order</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
