import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt } from '../../lib/helpers';
import { PencilIcon } from '../icons/Icon';

function bankLineFor(company, ccy) {
  if (ccy === 'GBP') return company.accountGBP;
  if (ccy === 'USD') return company.accountUSD;
  if (ccy === 'EUR') return company.accountEUR;
  return company.accountAUD;
}

function InvoiceTabSales({ customer, orders }) {
  const completed = orders.filter((o) => o.status === 'Completed');
  if (!completed.length) {
    return <div className="elg-panel"><div className="elg-empty">No invoiced activity yet — monthly totals for {customer.company} will appear here once orders are completed.</div></div>;
  }
  const byMonth = {};
  completed.forEach((o) => {
    const month = o.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(o);
  });
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div className="elg-panel elg-table-wrap">
      <table className="elg-table">
        <thead><tr><th>Month</th><th>Orders</th><th>Invoice Total</th><th>Commission %</th><th>Your Commission</th></tr></thead>
        <tbody>
          {months.map((month) => {
            const mOrders = byMonth[month];
            const totals = {}; const commTotals = {};
            mOrders.forEach((o) => { totals[o.currency] = (totals[o.currency] || 0) + o.price; commTotals[o.currency] = (commTotals[o.currency] || 0) + commissionAmt(o); });
            const rates = [...new Set(mOrders.map((o) => o.commissionRate))];
            const rateStr = rates.length === 1 ? rates[0] + '%' : rates.map((r) => r + '%').join(' / ');
            const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <tr key={month}>
                <td>{monthLabel}</td>
                <td>{mOrders.length}</td>
                <td>{Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
                <td>{rateStr}</td>
                <td>{Object.entries(commTotals).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '12px 12px', fontSize: 11.5, color: 'var(--elg-ink-3)' }}>
        Totals only — order-level detail and invoice downloads are only available to admin.
      </div>
    </div>
  );
}

export default function InvoiceTab({ customer, orders, onApproved }) {
  const { isAdmin, company, nextInvoiceNo, approveInvoice, updateOrder } = useAppState();
  const { toast } = useUi();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  if (!isAdmin) return <InvoiceTabSales customer={customer} orders={orders} />;

  const draft = orders.filter((o) => !o.invoiced && o.status === 'Completed');
  if (!draft.length) {
    return <div className="elg-panel"><div className="elg-empty">Nothing to invoice — all completed orders for {customer.company} have already been invoiced. Complete a pending order or add a new one.</div></div>;
  }
  const total = draft.reduce((s, o) => s + o.price, 0);
  const commTotal = draft.reduce((s, o) => s + commissionAmt(o), 0);

  function startEdit(o) { setEditingId(o.id); setEditName(o.name); setEditPrice(o.price); }
  function cancelEdit() { setEditingId(null); }
  async function saveEdit(o) {
    const name = editName.trim();
    const price = Number(editPrice);
    if (!name || !price) { toast('Order name and price are required.'); return; }
    try {
      await updateOrder(o.id, { name, price });
      setEditingId(null);
      toast('Order updated — reflected on the Orders screen too.');
    } catch (e) {
      toast(e.message);
    }
  }
  async function handleApprove() {
    try {
      const inv = await approveInvoice(customer.id);
      if (inv) {
        toast(inv.invoiceNo + ' approved. Download is now available.');
        if (onApproved) onApproved();
      }
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <div className="elg-badge elg-badge-pending-pay" style={{ marginBottom: 14 }}>Pending review &middot; draft, not yet finalized</div>
      <div className="elg-invoice-doc">
        <div className="idr">
          <div><h2>{company.name}</h2><div className="meta">{company.address}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: 'var(--elg-ink)' }}>Draft invoice</div>
            <div className="meta">Will be numbered {'INV-0' + nextInvoiceNo} on approval</div>
            <div className="meta">Bill to: {customer.company}</div>
            <div className="meta">Customer ID: {customer.customerCode || '—'}</div>
          </div>
        </div>
        <table className="elg-table">
          <thead><tr><th>Order</th><th>Date</th><th style={{ textAlign: 'right' }}>Price</th><th></th></tr></thead>
          <tbody>
            {draft.map((o) => (editingId === o.id ? (
              <tr key={o.id}>
                <td><input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--elg-primary)', borderRadius: 8, fontSize: 12.5, fontFamily: 'var(--elg-font-sans)' }} /></td>
                <td>{o.date}</td>
                <td style={{ textAlign: 'right' }}><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: 90, padding: '6px 8px', border: '1px solid var(--elg-primary)', borderRadius: 8, fontSize: 12.5, fontFamily: 'var(--elg-font-sans)', textAlign: 'right' }} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="elg-btn elg-btn-primary elg-btn-sm" style={{ width: 'auto' }} onClick={() => saveEdit(o)}>Save</button>
                  <button className="elg-btn elg-btn-ghost elg-btn-sm" style={{ width: 'auto' }} onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={o.id}>
                <td>{o.name}</td><td>{o.date}</td><td style={{ textAlign: 'right' }}>{fmt(o.price, o.currency)}</td>
                <td><button className="elg-icon-sq" onClick={() => startEdit(o)} title="Edit"><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button></td>
              </tr>
            )))}
            <tr className="elg-invoice-total-row"><td colSpan={2}>Total</td><td style={{ textAlign: 'right' }}>{fmt(total, customer.currency)}</td><td></td></tr>
          </tbody>
        </table>
        <div className="elg-bank-box">
          <strong>Payment Details</strong><br />
          {company.bankName} &middot; {company.accountName}<br />
          {bankLineFor(company, customer.currency)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 14, color: 'var(--elg-ink-2)' }}>Commission for {customer.salesperson} on this invoice: <strong style={{ color: 'var(--elg-ink)', fontWeight: 500 }}>{fmt(commTotal, customer.currency)}</strong></div>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleApprove}>Approve Invoice</button>
      </div>
    </>
  );
}
