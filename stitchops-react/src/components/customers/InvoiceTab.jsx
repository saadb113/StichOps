import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt } from '../../lib/helpers';
import { PencilIcon } from '../icons/Icon';
import OrderFormModal from '../orders/OrderFormModal';

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
  const { isAdmin, company, bankAccounts, approveInvoice } = useAppState();
  const { toast, openModal } = useUi();
  const [editMode, setEditMode] = useState(false);

  if (!isAdmin) return <InvoiceTabSales customer={customer} orders={orders} />;

  const draft = orders.filter((o) => !o.invoiced && o.status === 'Completed');
  if (!draft.length) {
    return <div className="elg-panel"><div className="elg-empty">Nothing to invoice — all completed orders for {customer.company} have already been invoiced. Complete a pending order or add a new one.</div></div>;
  }
  const total = draft.reduce((s, o) => s + o.price, 0);
  const commTotal = draft.reduce((s, o) => s + commissionAmt(o), 0);
  const bankAccount = bankAccounts.find((a) => a.currency === customer.currency);

  function editOrder(o) {
    openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' });
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
          <div>
            <img src="/images/elegant-design-icon.png" width="34" height="36" style={{ marginBottom: '8px' }} />
            <div style={{ maxWidth: '150px' }} className="meta">{company.address}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div className="meta">Bill to: {customer.customerCode || '—'}</div>
            <div className="company-name">{customer.company}</div>
            {customer.address && <div className="meta">{customer.address}</div>}
            {(customer.zip || customer.country) && (
              <div className="meta">{[customer.zip, customer.country].filter(Boolean).join(', ')}</div>
            )}
          </div>
        </div>
        <table className="elg-table">
          <thead><tr><th>Order</th><th>Date</th><th style={{ textAlign: 'right' }}>Price</th>{editMode && <th></th>}</tr></thead>
          <tbody>
            {draft.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td><td>{o.date}</td><td style={{ textAlign: 'right' }}>{fmt(o.price, o.currency)}</td>
                {editMode && (
                  <td className="elg-edit-btn"><button className="elg-icon-sq" onClick={() => editOrder(o)} title="Edit"><img src="/images/edit.svg" alt="Edit Icon" width={14} height={14} /></button></td>
                )}
              </tr>
            ))}
            <tr className="elg-invoice-total-row"><td colSpan={2}>Total</td><td style={{ textAlign: 'right' }}>{fmt(total, customer.currency)}</td>{editMode && <td></td>}</tr>
          </tbody>
        </table>
        <div className="elg-bank-box">
          <strong>Payment Details</strong><br />
          {bankAccount ? (
            <>
              {bankAccount.accountName}<br />
              {bankAccount.accountNo}
            </>
          ) : (
            <span>No {customer.currency} bank account on file.</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 14, color: 'var(--elg-ink-2)' }}>Commission for {customer.salesperson} on this invoice: <strong style={{ color: 'var(--elg-ink)', fontWeight: 500 }}>{fmt(commTotal, customer.currency)}</strong></div>
        <div style={{ display: 'flex', gap: 10 }}>
          {editMode ? (
            <>
              <button className="elg-btn" style={{ width: 'auto' }} onClick={() => setEditMode(false)}>Cancel</button>
              <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={() => setEditMode(false)}>Save Changes</button>
            </>
          ) : (
            <>
              <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setEditMode(true)}>
                <PencilIcon width={13} height={13} /> Edit Orders
              </button>
              <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleApprove}>Approve Invoice</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
