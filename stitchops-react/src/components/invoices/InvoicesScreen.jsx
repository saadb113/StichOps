import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, paymentBadge } from '../../lib/helpers';
import { SYM } from '../../lib/constants';
import EditInvoiceOrdersModal from './EditInvoiceOrdersModal';

export default function InvoicesScreen() {
  const { invoices, getCustomer, togglePaymentStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');

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

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Invoices</div><div className="page-sub">{list.length} invoice{list.length === 1 ? '' : 's'}</div></div>
      </div>
      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }} />
          <button className="btn btn-sm" onClick={() => setDate('')}>Show all dates</button>
          <div className="search" style={{ width: 220 }}>
            <span>&#128269;</span>
            <input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }}>
            <option value="">All currencies</option>
            {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }}>
            <option value="">All payment statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending (under 1 month)</option>
            <option value="Overdue1">Unpaid — 1 month</option>
            <option value="Overdue2">Unpaid — 2+ months</option>
          </select>
        </div>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment status</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="empty">No invoices match these filters.</td></tr>}
            {list.map((i) => {
              const c = getCustomer(i.customerId);
              const pb = paymentBadge(i);
              return (
                <tr key={i.id}>
                  <td>{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</td>
                  <td className="clickable" onClick={() => navigate(`/customers/${i.customerId}`)}>{c ? c.company : '—'}</td>
                  <td>{i.generatedDate}</td>
                  <td>{fmt(i.total, i.currency)}</td>
                  <td><span className={`badge ${pb.cls}`} style={{ cursor: 'pointer' }} onClick={() => handleToggle(i.id)} title="Click to toggle Paid/Unpaid">{pb.label}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => toast(`Downloading ${i.invoiceNo}.pdf`)}>Download</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => openModal(<EditInvoiceOrdersModal invoiceId={i.id} />)}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
