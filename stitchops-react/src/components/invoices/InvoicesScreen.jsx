import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { paymentBadge } from '../../lib/helpers';
import { SYM } from '../../lib/constants';
import { downloadInvoicePdf } from '../../lib/invoicePdf';
import EditInvoiceOrdersModal from './EditInvoiceOrdersModal';
import { SearchIcon, CalendarIcon, DownloadIcon, KebabIcon, PencilIcon } from '../icons/Icon';

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
  const { invoices, orders, company, getCustomer, togglePaymentStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [date, setDate] = useState('');
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
  if (date) list = list.filter((i) => i.generatedDate === date);
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
    list = list.filter((i) => { const c = getCustomer(i.customerId); return c && (c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)); });
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
    downloadInvoicePdf({ invoice: inv, customer, company, orders: lineOrders });
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
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search invoices or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-date-field">
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          {date && <button className="elg-date-clear" title="Clear date" onClick={() => setDate('')}>&times;</button>}
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
          {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Currency</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="elg-empty">No invoices match these filters.</td></tr>}
            {list.map((i) => {
              const c = getCustomer(i.customerId);
              const bi = invoiceBadgeInfo(i);
              return (
                <tr key={i.id}>
                  <td>{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</td>
                  <td className="clickable" onClick={() => navigate(`/customers/${i.customerId}`)}>{c ? c.company : '—'}</td>
                  <td>{i.generatedDate}</td>
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
