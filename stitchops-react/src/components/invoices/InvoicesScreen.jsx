import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { paymentBadge, isInvoiceNotificationDay, matchesSearch, fmt, convertToDefault } from '../../lib/helpers';
import { CUSTOMER_CURRENCIES } from '../../lib/constants';
import { downloadInvoicePdf } from '../../lib/invoicePdf';
import EditInvoiceOrdersModal from './EditInvoiceOrdersModal';
import ConfirmMarkPaidModal from './ConfirmMarkPaidModal';
import SelectBankAccountModal from '../customers/SelectBankAccountModal';
import MobileFilterModal from '../layout/MobileFilterModal';
import RangeDateField from '../common/RangeDateField';
import { SearchIcon, CalendarIcon, DownloadIcon, KebabIcon, PencilIcon, FilterIcon, DocIcon, CheckIcon, WarningIcon, ClockIcon } from '../icons/Icon';

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
  const { invoices, orders, customers, company, bankAccounts, currencyRates, getCustomer, togglePaymentStatus, sendInvoiceReminder, setInvoiceBankAccount } = useAppState();
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

  // The overview cards summarize the same date/currency/search-filtered set
  // the table shows, but never the status dropdown — picking a status to
  // narrow the table shouldn't zero out the other cards' counts.
  let statsBase = invoices.filter((i) => i.status === 'approved');
  if (dueToday) {
    const dueCustomerIds = new Set(customers.filter((c) => isInvoiceNotificationDay(c.invoiceDay)).map((c) => c.id));
    statsBase = statsBase.filter((i) => dueCustomerIds.has(i.customerId));
  }
  if (from) statsBase = statsBase.filter((i) => i.generatedDate >= from);
  if (to) statsBase = statsBase.filter((i) => i.generatedDate <= to);
  if (currency) statsBase = statsBase.filter((i) => i.currency === currency);
  if (search) {
    statsBase = statsBase.filter((i) => { const c = getCustomer(i.customerId); return matchesSearch(search, i.invoiceNo, c?.company, c?.name, c?.salesperson); });
  }
  const paidCount = statsBase.filter((i) => paymentBadge(i).label === 'Paid').length;
  const overdueCount = statsBase.filter((i) => paymentBadge(i).cls === 'b-unpaid').length;
  const unpaidCount = statsBase.length - paidCount;

  // Outstanding = everything not yet paid, kept per currency (each customer
  // is billed in their own currency) plus one converted total.
  const outstandingByCcy = {};
  statsBase.filter((i) => paymentBadge(i).label !== 'Paid').forEach((i) => {
    outstandingByCcy[i.currency] = (outstandingByCcy[i.currency] || 0) + i.total;
  });
  const defaultCurrency = company?.defaultCurrency || 'PKR';
  let outstandingConverted = 0;
  let outstandingHasUnknownRate = false;
  Object.entries(outstandingByCcy).forEach(([cc, v]) => {
    const converted = convertToDefault(v, cc, currencyRates || [], defaultCurrency);
    if (converted == null) outstandingHasUnknownRate = true;
    else outstandingConverted += converted;
  });

  // Month quick-filter: choosing a month sets the date range to that whole
  // month, so the table and every card above follow it.
  const monthKeys = [...new Set(invoices.filter((i) => i.status === 'approved').map((i) => i.generatedDate.slice(0, 7)))].sort().reverse();
  const monthLabel = (key) => new Date(key + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const lastDayOf = (key) => {
    const [y, m] = key.split('-').map(Number);
    return key + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0');
  };
  const selectedMonth = monthKeys.find((k) => from === k + '-01' && to === lastDayOf(k)) || '';
  function handleMonthChange(key) {
    if (!key) { setFrom(''); setTo(''); return; }
    setFrom(key + '-01');
    setTo(lastDayOf(key));
  }

  let list = statsBase;
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
  list = list.slice().sort((a, b) => b.id - a.id);

  async function handleToggle(inv) {
    // Marking an invoice Paid is a billing event — confirm it first. Reverting
    // a Paid invoice back to Pending stays a plain click (a correction, not
    // something that needs a guard).
    if (inv.paymentStatus !== 'Completed') {
      const c = getCustomer(inv.customerId);
      openModal(<ConfirmMarkPaidModal invoice={inv} customerName={c?.company} />, { variant: 'elegant' });
      return;
    }
    try {
      const next = await togglePaymentStatus(inv.id);
      toast('Payment marked as ' + next + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  async function handleRemind(inv) {
    try {
      await sendInvoiceReminder(inv.id);
      const c = getCustomer(inv.customerId);
      toast('Reminder for ' + inv.invoiceNo + ' sent to ' + (c?.email || 'the customer') + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  function paidInfo(inv) {
    if (inv.paymentStatus !== 'Completed') return '';
    return [inv.paidDate, inv.paymentMethod].filter(Boolean).join(' · ');
  }

  function invoiceBankAccount(inv) {
    const customer = getCustomer(inv.customerId);
    return inv.bankAccountId
      ? bankAccounts.find((a) => a.id === inv.bankAccountId)
      : bankAccounts.find((a) => a.currency === customer?.currency);
  }

  function handleDownload(inv) {
    const customer = getCustomer(inv.customerId);
    const lineOrders = orders.filter((o) => inv.orderIds.includes(o.id));
    downloadInvoicePdf({ invoice: inv, customer, company, orders: lineOrders, bankAccount: invoiceBankAccount(inv) });
  }

  async function handleSelectBank(inv, bankAccountId) {
    try {
      await setInvoiceBankAccount(inv.id, bankAccountId);
    } catch (e) {
      toast(e.message);
    }
  }

  function openBankModal(inv) {
    openModal(
      <SelectBankAccountModal selectedId={invoiceBankAccount(inv)?.id} onSelect={(id) => handleSelectBank(inv, id)} />,
      { variant: 'elegant' }
    );
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
        <div className="elg-page-head-range">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} align="right" />
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search invoices or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-filterbar-actions">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <select className="elg-select" value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)}>
            <option value="">All Months</option>
            {monthKeys.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
          </select>
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
        </div>
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
                { key: 'currency', label: 'Currency', allLabel: 'All Currencies', options: CUSTOMER_CURRENCIES.map((cc) => ({ value: cc, label: cc })) }
              ]}
              values={{ status, currency }}
              onApply={(v) => { setStatus(v.status); setCurrency(v.currency); }}
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
      </div>

      <div className="elg-metric-grid">
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Total Invoices</span><span className="elg-metric-icon"><img src="/images/todays-invoice.svg" alt="" /></span></div>
          <div className="elg-metric-value">{statsBase.length}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Paid Invoices</span><span className="elg-metric-icon"><img src="/images/paid-invoices.svg" alt="" /></span></div>
          <div className="elg-metric-value">{paidCount}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Unpaid Invoices</span><span className="elg-metric-icon"><img src="/images/unpaid-invoices.svg" alt="" /></span></div>
          <div className="elg-metric-value">{unpaidCount}</div>
          <div className="elg-metric-sub">Pending or overdue</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Overdue Invoices</span><span className="elg-metric-icon"><img src="/images/overdue-invoices.svg" alt="" /></span></div>
          <div className="elg-metric-value">{overdueCount}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
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
                      <button onClick={() => { setOpenMenuId(null); openBankModal(i); }}>
                        Select Bank
                      </button>
                      {i.paymentStatus !== 'Completed' && (
                        <button onClick={() => { setOpenMenuId(null); handleRemind(i); }}>Send Reminder</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="elg-mobile-card-row"><CalendarIcon width={14} height={14} />{i.generatedDate}</div>
              <div className="elg-mobile-card-foot">
                <span className={`elg-badge clickable ${bi.cls}`} onClick={() => handleToggle(i)} title="Click to toggle Paid/Unpaid">{bi.label}</span>
                <span className="elg-mobile-card-price">{i.currency} {i.total.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Currency</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
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
                  <td>
                    <span className={`elg-badge clickable ${bi.cls}`} onClick={() => handleToggle(i)} title={i.paymentNote || 'Click to toggle Paid/Unpaid'}>{bi.label}</span>
                    {paidInfo(i) && <div style={{ fontSize: 11.5, color: 'var(--elg-ink-3)', marginTop: 4 }}>{paidInfo(i)}</div>}
                    {i.paymentStatus !== 'Completed' && i.reminderCount > 0 && <div style={{ fontSize: 11.5, color: 'var(--elg-ink-3)', marginTop: 4 }}>Reminded {i.reminderCount}x</div>}
                  </td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="Download" onClick={() => handleDownload(i)}><img src="/images/download-invoice.svg"/></button>
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                      {openMenuId === i.id && (
                        <div className="elg-row-menu">
                          <button onClick={() => { setOpenMenuId(null); openModal(<EditInvoiceOrdersModal invoiceId={i.id} />, { variant: 'elegant' }); }}>
                            <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                          </button>
                          <button onClick={() => { setOpenMenuId(null); openBankModal(i); }}>
                            Select Bank
                          </button>
                          {i.paymentStatus !== 'Completed' && (
                            <button onClick={() => { setOpenMenuId(null); handleRemind(i); }}>Send Reminder</button>
                          )}
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
