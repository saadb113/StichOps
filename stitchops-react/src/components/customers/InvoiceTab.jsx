import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt } from '../../lib/helpers';

function bankLineFor(company, ccy) {
  if (ccy === 'GBP') return company.accountGBP;
  if (ccy === 'USD') return company.accountUSD;
  if (ccy === 'EUR') return company.accountEUR;
  return company.accountAUD;
}

function InvoiceTabSales({ customer, orders }) {
  const completed = orders.filter((o) => o.status === 'Completed');
  if (!completed.length) {
    return <div className="panel"><div className="empty"><i>No invoiced activity yet</i>Monthly totals for {customer.company} will appear here once orders are completed.</div></div>;
  }
  const byMonth = {};
  completed.forEach((o) => {
    const month = o.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(o);
  });
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div className="panel">
      <table>
        <thead><tr><th>Month</th><th>Orders</th><th>Invoice total</th><th>Commission %</th><th>Your commission</th></tr></thead>
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
      <div style={{ padding: '10px 18px', fontSize: '11.5px', color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>Totals only — order-level detail and invoice downloads are only available to admin.</div>
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
    return <div className="panel"><div className="empty"><i>Nothing to invoice</i>All completed orders for {customer.company} have already been invoiced. Complete a pending order or add a new one.</div></div>;
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
      <div className="badge b-review" style={{ marginBottom: 12, fontSize: 12, padding: '5px 12px' }}>Pending review &middot; draft, not yet finalized</div>
      <div className="invoice-doc">
        <div className="idr">
          <div><h2>{company.name}</h2><div style={{ color: 'var(--ink-2)' }}>{company.address}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>Draft invoice</div>
            <div style={{ color: 'var(--ink-2)' }}>Will be numbered {'INV-0' + nextInvoiceNo} on approval</div>
            <div style={{ color: 'var(--ink-2)' }}>Bill to: {customer.company}</div>
            <div style={{ color: 'var(--ink-2)' }}>Customer ID: {customer.customerCode || '—'}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Order</th><th>Date</th><th style={{ textAlign: 'right' }}>Price</th><th></th></tr></thead>
          <tbody>
            {draft.map((o) => (editingId === o.id ? (
              <tr key={o.id}>
                <td><input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)' }} /></td>
                <td>{o.date}</td>
                <td style={{ textAlign: 'right' }}><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: 90, padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)', textAlign: 'right' }} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => saveEdit(o)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={o.id}>
                <td>{o.name}</td><td>{o.date}</td><td style={{ textAlign: 'right' }}>{fmt(o.price, o.currency)}</td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => startEdit(o)} title="Edit">&#9998;</button></td>
              </tr>
            )))}
            <tr className="invoice-total-row"><td colSpan={2}>Total</td><td style={{ textAlign: 'right' }}>{fmt(total, customer.currency)}</td><td></td></tr>
          </tbody>
        </table>
        <div className="bank-box">
          <strong>Payment details</strong><br />
          {company.bankName} &middot; {company.accountName}<br />
          {bankLineFor(company, customer.currency)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Commission for {customer.salesperson} on this invoice: <strong>{fmt(commTotal, customer.currency)}</strong></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleApprove}>Approve invoice</button>
        </div>
      </div>
    </>
  );
}
