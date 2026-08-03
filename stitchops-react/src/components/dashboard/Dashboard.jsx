import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { fmt, isActive, paymentBadge } from '../../lib/helpers';
import { TODAY } from '../../lib/constants';

export default function Dashboard() {
  const { customers, orders, employees, invoices, passwordResetRequests, getCustomer } = useAppState();
  const navigate = useNavigate();
  const [refDate, setRefDate] = useState(TODAY);

  const todaysOrders = orders.filter((o) => o.date === refDate);
  const todaysTotals = {};
  todaysOrders.forEach((o) => { todaysTotals[o.currency] = (todaysTotals[o.currency] || 0) + o.price; });
  const activeCount = customers.filter((c) => isActive(orders, c, refDate)).length;
  const pendingReview = orders.filter((o) => !o.invoiced && o.status === 'Completed').length;

  const monthPrefix = refDate.slice(0, 7); // 'YYYY-MM' of the selected day
  const monthName = new Date(monthPrefix + '-01').toLocaleDateString('en-US', { month: 'long' });
  const dueSoon = customers.filter((c) => {
    if (!c.invoiceDay) return false;
    const d = new Date(monthPrefix + '-' + String(c.invoiceDay).padStart(2, '0'));
    const today = new Date(refDate);
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  const payoutsSoon = employees.filter((e) => {
    const d = new Date(monthPrefix + '-' + String(e.payoutDay).padStart(2, '0'));
    const today = new Date(refDate);
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 3;
  });

  const overdueInvoices = invoices.filter((i) => i.status === 'approved' && i.paymentStatus !== 'Completed' && paymentBadge(i).cls === 'b-unpaid');
  const totalsStr = Object.keys(todaysTotals).length
    ? Object.entries(todaysTotals).map(([cc, v]) => fmt(v, cc)).join(' + ')
    : 'No orders on this day';

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Dashboard</div><div className="page-sub">Showing results for the selected day</div></div>
        <div className="field" style={{ margin: 0 }}><input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} style={{ width: 'auto' }} /></div>
      </div>

      {dueSoon.length > 0 && (
        <div className="flag"><span>&#9888;</span><div>{dueSoon.map((c) => (<span key={c.id}><strong>{c.company}</strong>'s invoice is due on {c.invoiceDay} {monthName}. </span>))}</div></div>
      )}
      {payoutsSoon.length > 0 && (
        <div className="flag"><span>&#9888;</span><div>{payoutsSoon.map((e) => (<span key={e.id}><strong>{e.name}</strong>'s salary slip is due on {e.payoutDay} {monthName}. </span>))}</div></div>
      )}
      {overdueInvoices.length > 0 && (
        <div className="flag" style={{ background: 'var(--red-soft)', color: 'var(--red-ink)', borderColor: '#E3AFA9' }}>
          <span>&#9888;</span>
          <div>{overdueInvoices.map((i) => (<span key={i.id}><strong>{getCustomer(i.customerId).company}</strong>'s invoice {i.invoiceNo} is unpaid ({paymentBadge(i).label.replace('Unpaid — ', '')} overdue). </span>))}</div>
        </div>
      )}
      {passwordResetRequests.length > 0 && (
        <div className="flag" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}><span>&#9888;</span><div>{passwordResetRequests.length} salesperson{passwordResetRequests.length > 1 ? 's have' : ' has'} requested a password reset.</div></div>
          <button className="btn btn-sm" onClick={() => navigate('/employees')}>Review</button>
        </div>
      )}

      <div className="grid4">
        <div className="metric"><div className="label">Active customers</div><div className="value">{activeCount}</div><div className="sub">of {customers.length} total</div></div>
        <div className="metric"><div className="label">Orders on {refDate}</div><div className="value">{todaysOrders.length}</div><div className="sub">across all currencies</div></div>
        <div className="metric"><div className="label">Ready to invoice</div><div className="value">{pendingReview}</div><div className="sub">completed, not yet invoiced</div></div>
        <div className="metric"><div className="label">Revenue on {refDate}</div><div className="value" style={{ fontSize: 16 }}>{totalsStr}</div><div className="sub">selected day only</div></div>
      </div>

      <div className="hint" style={{ margin: '-10px 0 18px' }}>
        For growth over time and custom date ranges, see the <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }} style={{ color: 'var(--accent)' }}>Reports</a> page.
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Recent orders</h3><button className="btn btn-sm" onClick={() => navigate('/customers')}>View all customers</button></div>
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {orders.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((o) => (
              <tr className="clickable" key={o.id} onClick={() => navigate(`/customers/${o.customerId}`)}>
                <td>{o.name}</td>
                <td>{getCustomer(o.customerId).company}</td>
                <td>{o.date}</td>
                <td>{fmt(o.price, o.currency)}</td>
                <td><span className={`badge ${o.status === 'Completed' ? 'b-completed' : 'b-pending'}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
