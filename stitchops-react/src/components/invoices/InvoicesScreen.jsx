import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { paymentBadge } from '../../lib/helpers';
import { CUSTOMER_CURRENCIES } from '../../lib/constants';
import { downloadInvoicePdf } from '../../lib/invoicePdf';
import EditInvoiceOrdersModal from './EditInvoiceOrdersModal';
import MobileFilterModal from '../layout/MobileFilterModal';
import { SearchIcon, CalendarIcon, DownloadIcon, KebabIcon, PencilIcon, FilterIcon } from '../icons/Icon';

function invoiceBadgeInfo(inv) {
  const pb = paymentBadge(inv);
  if (pb.cls === 'b-completed') return { label: 'Paid', cls: 'elg-badge-paid' };
  const m = pb.label.match(/Unpaid — (\d+) months?/);
  if (m) {
    const n = Number(m[1]);
    return { label: `Unpaid (${n} Month${n > 1 ? 's' : ''})`, cls: 'elg-badge-unpaid' };
  }
  return { label: 'Unpaid', cls: 'elg-badge-unpaid' };
}

export default function InvoicesScreen() {
  const { invoices, orders, customers, company, bankAccounts, getCustomer, togglePaymentStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dueToday = searchParams.get('dueToday') === '1';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  let list = invoices.filter((i) => i.status === 'approved');
  if (dueToday) {
    const todayDate = new Date().getDate();
    const dueCustomerIds = new Set(customers.filter((c) => c.invoiceDay === todayDate).map((c) => c.id));
    list = list.filter((i) => dueCustomerIds.has(i.customerId));
  }
  if (from) list = list.filter((i) => i.generatedDate >= from);
  if (to) list = list.filter((i) => i.generatedDate <= to);
  if (currency) list = list.filter((i) => i.currency === currency);
  if (status) {
    list = list.filter((i) => {
      const pb = paymentBadge(i);
      if (status === 'Paid') return pb.label === 'Paid';
      if (status === 'Pending') return pb.cls === 'b-pending';
      if (status === 'Overdue1') return pb.label === 'Unpaid — 1 month';
      if (status === 'Overdue2') return pb.cls === 'b-unpaid' && pb.label !== 'Unpaid — 1 month';
      return true;
    });
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((i) => { const c = getCustomer(i.customerId); return c && (c.company.toLowerCase().startsWith(q) || c.name.toLowerCase().startsWith(q)); });
  }
  list = list.sort((a, b) => b.id - a.id);

  async function handleToggle(id) {
    try {
      const next = await togglePaymentStatus(id);
      toast('Payment marked as ' + next + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  function handleDownload(inv) {
    const customer = getCustomer(inv.customerId);
    const lineOrders = orders.filter((o) => inv.orderIds.includes(o.id));
    const bankAccount = bankAccounts.find((a) => a.currency === (customer?.currency));
    downloadInvoicePdf({ invoice: inv, customer, company, orders: lineOrders, bankAccount });
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Invoices</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Invoices</div>
          <div className="elg-page-sub">{list.length} invoice{list.length === 1 ? '' : 's'}</div>
        </div>
        {dueToday && (
          <button className="elg-btn elg-btn-ghost" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => setSearchParams({})}>
            Showing customers due today &times; Clear filter
          </button>
        )}
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search invoices or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <option value="Paid">Paid</option>
          <option value="Pending">Pending (under 1 month)</option>
          <option value="Overdue1">Unpaid — 1 month</option>
          <option value="Overdue2">Unpaid — 2+ months</option>
        </select>
        <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="">All Currencies</option>
          {CUSTOMER_CURRENCIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <button
          className="elg-mobile-filter-btn"
          title="Filter"
          onClick={() => openModal(
            <MobileFilterModal
              title="Filter Invoices"
              fields={[
                { key: 'status', label: 'Status', allLabel: 'All Status', options: [
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending (under 1 month)' },
                  { value: 'Overdue1', label: 'Unpaid — 1 month' },
                  { value: 'Overdue2', label: 'Unpaid — 2+ months' }
                ] },
                { key: 'currency', label: 'Currency', allLabel: 'All Currencies', options: CUSTOMER_CURRENCIES.map((cc) => ({ value: cc, label: cc })) },
                { type: 'dateRange', key: 'date', label: 'Date', fromKey: 'from', toKey: 'to' }
              ]}
              values={{ status, currency, from, to }}
              onApply={(v) => { setStatus(v.status); setCurrency(v.currency); setFrom(v.from); setTo(v.to); }}
            />,
            { variant: 'elegant' }
          )}
        >
          <FilterIcon />
        </button>
      </div>

      <div className="elg-mobile-filter-chips">
        {status && <span className="elg-mobile-filter-chip">{status}<button onClick={() => setStatus('')}>&times;</button></span>}
        {currency && <span className="elg-mobile-filter-chip">{currency}<button onClick={() => setCurrency('')}>&times;</button></span>}
        {(from || to) && <span className="elg-mobile-filter-chip">{from || '…'} – {to || '…'}<button onClick={() => { setFrom(''); setTo(''); }}>&times;</button></span>}
      </div>

      <div className="elg-mobile-cards">
        {list.length === 0 && <div className="elg-empty">No invoices match these filters.</div>}
        {list.map((i) => {
          const c = getCustomer(i.customerId);
          const bi = invoiceBadgeInfo(i);
          return (
            <div key={i.id} className="elg-mobile-card">
              <div className="elg-mobile-card-head" onClick={() => navigate(`/customers/${i.customerId}`)}>
                <div>
                  <div className="elg-mobile-card-title">{c ? c.company : '—'}</div>
                  <div className="elg-mobile-card-subtitle">{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</div>
                </div>
                <div className="elg-row-actions" onClick={(ev) => ev.stopPropagation()}>
                  <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                  {openMenuId === i.id && (
                    <div className="elg-row-menu">
                      <button onClick={() => { setOpenMenuId(null); openModal(<EditInvoiceOrdersModal invoiceId={i.id} />, { variant: 'elegant' }); }}>
                        <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                      </button>
                      <button onClick={() => { setOpenMenuId(null); handleDownload(i); }}>
                        <img src="/images/download-invoice.svg" alt="Download" width="14" height="14" /> Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="elg-mobile-card-row"><CalendarIcon width={14} height={14} />{i.generatedDate}</div>
              <div className="elg-mobile-card-foot">
                <span className={`elg-badge clickable ${bi.cls}`} onClick={() => handleToggle(i.id)} title="Click to toggle Paid/Unpaid">{bi.label}</span>
                <span className="elg-mobile-card-price">{i.currency} {i.total.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Currency</th><th>Price</th><th>Status</th><th style={{minWidth : "150px"}}>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="elg-empty">No invoices match these filters.</td></tr>}
            {list.map((i) => {
              const c = getCustomer(i.customerId);
              const bi = invoiceBadgeInfo(i);
              return (
                <tr key={i.id}>
                  <td>{i.generatedDate}</td>
                  <td>{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</td>
                  <td className="clickable" onClick={() => navigate(`/customers/${i.customerId}`)}>{c ? c.company : '—'}</td>
                  <td>{i.currency}</td>
                  <td>{i.total.toFixed(2)}</td>
                  <td><span className={`elg-badge clickable ${bi.cls}`} onClick={() => handleToggle(i.id)} title="Click to toggle Paid/Unpaid">{bi.label}</span></td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="Download" onClick={() => handleDownload(i)}><img src="/images/download-invoice.svg"/></button>
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                      {openMenuId === i.id && (
                        <div className="elg-row-menu">
                          <button onClick={() => { setOpenMenuId(null); openModal(<EditInvoiceOrdersModal invoiceId={i.id} />, { variant: 'elegant' }); }}>
                            <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                          </button>
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
