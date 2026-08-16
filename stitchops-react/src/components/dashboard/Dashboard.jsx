import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt, isActive, paymentBadge } from '../../lib/helpers';
import { TODAY } from '../../lib/constants';
import OrderFormModal from '../orders/OrderFormModal';
import { PeopleIcon, BagIcon, DocIcon, TrendUpIcon, CalendarIcon, WarningIcon, PencilIcon, KebabIcon } from '../icons/Icon';

function greetingFor(date) {
  const h = new Date(date).getHours() || new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'In progress') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function Dashboard() {
  const { customers, orders, employees, invoices, passwordResetRequests, getCustomer } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [refDate, setRefDate] = useState(TODAY);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const todaysOrders = orders.filter((o) => o.date === refDate);
  const activeCount = customers.filter((c) => isActive(orders, c, refDate)).length;
  const pendingReview = orders.filter((o) => !o.invoiced && o.status === 'Completed').length;

  const monthPrefix = refDate.slice(0, 7); // 'YYYY-MM' of the selected day
  const monthName = new Date(monthPrefix + '-01').toLocaleDateString('en-US', { month: 'long' });

  const monthTotals = {};
  orders.filter((o) => o.date.slice(0, 7) === monthPrefix).forEach((o) => { monthTotals[o.currency] = (monthTotals[o.currency] || 0) + o.price; });
  const monthRevenueStr = Object.keys(monthTotals).length
    ? Object.entries(monthTotals).map(([cc, v]) => fmt(v, cc)).join(' + ')
    : fmt(0, customers[0]?.currency || 'GBP');

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

  const recent = orders.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div className="elg-page">
      <div className="elg-page-head" style={{ paddingBottom: 24, borderBottom : "1px solid #E8E8E8", marginBottom : 24}}>
        <div className="elg-greeting">{greetingFor(refDate)} <span>👋</span></div>
        <div className="elg-date-field">
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className="elg-flag"><WarningIcon /><div>{dueSoon.map((c) => (<span key={c.id}><strong>{c.company}</strong>'s invoice is due on {c.invoiceDay} {monthName}. </span>))}</div></div>
      )}
      {payoutsSoon.length > 0 && (
        <div className="elg-flag"><WarningIcon /><div>{payoutsSoon.map((e) => (<span key={e.id}><strong>{e.name}</strong>'s salary slip is due on {e.payoutDay} {monthName}. </span>))}</div></div>
      )}
      {overdueInvoices.length > 0 && (
        <div className="elg-flag danger">
          <WarningIcon />
          <div>{overdueInvoices.map((i) => (<span key={i.id}><strong>{getCustomer(i.customerId).company}</strong>'s invoice {i.invoiceNo} is unpaid ({paymentBadge(i).label.replace('Unpaid — ', '')} overdue). </span>))}</div>
        </div>
      )}
      {passwordResetRequests.length > 0 && (
        <div className="elg-flag">
          <WarningIcon />
          <div>{passwordResetRequests.length} salesperson{passwordResetRequests.length > 1 ? 's have' : ' has'} requested a password reset.</div>
          <button className="review-btn" onClick={() => navigate('/employees')}>Review</button>
        </div>
      )}

      <div className="elg-metric-grid">
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Active Customers</span><span className="elg-metric-icon"><img src="/images/active-customer.svg"   alt="" /></span></div>
          <div className="elg-metric-value">{activeCount}</div>
          <div className="elg-metric-sub">Of {customers.length} total</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Today's Orders</span><span className="elg-metric-icon"><img src="/images/todays-order.svg" alt="" /></span></div>
          <div className="elg-metric-value">{todaysOrders.length}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Ready to Invoice</span><span className="elg-metric-icon"><img src="/images/invoice.svg" alt="" /></span></div>
          <div className="elg-metric-value">{pendingReview}</div>
          <div className="elg-metric-sub">Completed, not yet invoiced</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Current Revenue</span><span className="elg-metric-icon"><img src="/images/revenue.svg" alt="" /></span></div>
          <div className="elg-metric-value">{monthRevenueStr}</div>
          <div className="elg-metric-sub">{monthName} Month</div>
        </div>
      </div>

      <div className="elg-hint-line">
        For growth over time and custom date ranges, see the <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>Reports</a> page.
      </div>

      <div className="elg-panel elg-table-wrap">
        <div className="elg-section-head">
          <div className="elg-section-title">Recent Orders</div>
          <button className="elg-btn" style={{ width: 'auto' }} onClick={() => navigate('/orders')}>View All</button>
        </div>
        <table className="elg-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Currency</th><th>Price</th><th>Commission</th><th>Action</th></tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={7} className="elg-empty">No orders yet.</td></tr>}
            {recent.map((o) => {
              const c = getCustomer(o.customerId);
              return (
                <tr key={o.id} className="clickable">
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{o.name}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{c ? c.company : '—'}</td>
                  <td><span className={`elg-badge ${elgStatusClass(o.status)}`}>{o.status}</span></td>
                  <td>{o.currency}</td>
                  <td>{o.price.toFixed(2)}</td>
                  <td>{commissionAmt(o).toFixed(2)} <span className="elg-comm-pct">({o.commissionRate}%)</span></td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><KebabIcon /></button>
                      {openMenuId === o.id && (
                        <div className="elg-row-menu">
                          <button onClick={() => { setOpenMenuId(null); openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' }); }}>
                            <PencilIcon width={13} height={13} /> Edit
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
