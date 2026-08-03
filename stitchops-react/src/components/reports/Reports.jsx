import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, paymentBadge, ordersInRange, rangeLengthDays, shiftRange, growthPct, commissionAmt } from '../../lib/helpers';
import { TODAY } from '../../lib/constants';

export default function Reports() {
  const { orders, invoices, getCustomer, togglePaymentStatus } = useAppState();
  const { toast } = useUi();
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState(TODAY);

  function setPeriod(p) {
    const ref = new Date(TODAY);
    let f; let t;
    if (p === 'day') { f = t = ref.toISOString().slice(0, 10); } else if (p === 'month') {
      f = new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString().slice(0, 10);
      t = ref.toISOString().slice(0, 10);
    } else {
      f = new Date(ref.getFullYear(), 0, 1).toISOString().slice(0, 10);
      t = ref.toISOString().slice(0, 10);
    }
    setFrom(f); setTo(t);
  }

  const curr = ordersInRange(orders, from, to);
  const days = rangeLengthDays(from, to);
  const [pFrom, pTo] = shiftRange(from, to, days);
  const prev = ordersInRange(orders, pFrom, pTo);

  const totalsByCcy = {}; curr.forEach((o) => { totalsByCcy[o.currency] = (totalsByCcy[o.currency] || 0) + o.price; });
  const prevTotalsByCcy = {}; prev.forEach((o) => { prevTotalsByCcy[o.currency] = (prevTotalsByCcy[o.currency] || 0) + o.price; });
  const orderGrowth = growthPct(curr.length, prev.length);

  const byDesigner = {};
  curr.forEach((o) => { byDesigner[o.designer] = (byDesigner[o.designer] || 0) + o.productionCost; });
  const bySales = {};
  curr.forEach((o) => {
    const c = getCustomer(o.customerId);
    if (!bySales[c.salesperson]) bySales[c.salesperson] = { count: 0, commission: {} };
    bySales[c.salesperson].count++;
    bySales[c.salesperson].commission[o.currency] = (bySales[c.salesperson].commission[o.currency] || 0) + commissionAmt(o);
  });

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
      <div className="topbar"><div><div className="page-title">Reports</div><div className="page-sub">{from} to {to} &middot; compared with the {days}-day period before</div></div></div>

      <div className="panel" style={{ padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={() => setPeriod('day')}>Today</button>
          <button className="btn btn-sm" onClick={() => setPeriod('month')}>This month</button>
          <button className="btn btn-sm" onClick={() => setPeriod('year')}>This year</button>
          <span style={{ width: 1, height: 20, background: 'var(--line)' }}></span>
          <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto' }} />
          <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>

      <div className="grid4">
        <div className="metric">
          <div className="label">Orders in range</div><div className="value">{curr.length}</div>
          <div className="sub" style={{ color: orderGrowth >= 0 ? 'var(--accent)' : 'var(--red)' }}>{orderGrowth >= 0 ? '+' : ''}{orderGrowth}% vs previous period</div>
        </div>
        {Object.keys(totalsByCcy).slice(0, 3).map((cc) => {
          const g = growthPct(totalsByCcy[cc], prevTotalsByCcy[cc] || 0);
          return (
            <div className="metric" key={cc}>
              <div className="label">Total {cc}</div><div className="value">{fmt(totalsByCcy[cc], cc)}</div>
              <div className="sub" style={{ color: g >= 0 ? 'var(--accent)' : 'var(--red)' }}>{g >= 0 ? '+' : ''}{g}% vs previous</div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Production cost by designer</h3></div>
        {Object.keys(byDesigner).length ? (
          <table>
            <thead><tr><th>Designer</th><th>Total production cost</th></tr></thead>
            <tbody>
              {Object.keys(byDesigner).map((d) => <tr key={d}><td>{d}</td><td>{byDesigner[d].toFixed(2)} (mixed currencies — totals shown per original order currency in the full build)</td></tr>)}
            </tbody>
          </table>
        ) : <div className="empty">No orders in this range.</div>}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Salesperson invoice / commission summary</h3></div>
        {Object.keys(bySales).length ? (
          <table>
            <thead><tr><th>Salesperson</th><th>Orders</th><th>Commission earned</th></tr></thead>
            <tbody>
              {Object.entries(bySales).map(([name, d]) => (
                <tr key={name}><td>{name}</td><td>{d.count}</td><td>{Object.entries(d.commission).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No orders in this range.</div>}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Client payment status</h3></div>
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Payment status</th><th></th></tr></thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={5} className="empty">No approved invoices yet.</td></tr>}
            {invoices.map((i) => {
              const c = getCustomer(i.customerId);
              const pb = paymentBadge(i);
              return (
                <tr key={i.id}>
                  <td>{i.invoiceNo}</td>
                  <td>{c.company}</td>
                  <td>{fmt(i.total, i.currency)}</td>
                  <td><span className={`badge ${pb.cls}`}>{pb.label}</span></td>
                  <td><button className="btn btn-sm" onClick={() => handleToggle(i.id)}>Mark as {i.paymentStatus === 'Completed' ? 'pending' : 'completed'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
