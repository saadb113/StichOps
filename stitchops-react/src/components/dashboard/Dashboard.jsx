import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt, isActive, paymentBadge, convertToDefault } from '../../lib/helpers';
import { TODAY, SYM } from '../../lib/constants';
import OrderFormModal from '../orders/OrderFormModal';
import ConfirmDeleteOrderModal from '../orders/ConfirmDeleteOrderModal';
import CustomerFormModal from '../customers/CustomerFormModal';
import EmployeeFormModal from '../employees/EmployeeFormModal';
import MobileFab from '../layout/MobileFab';
import { PeopleIcon, BagIcon, DocIcon, TrendUpIcon, CalendarIcon, WarningIcon, PencilIcon, KebabIcon, PersonIcon, CoinIcon } from '../icons/Icon';

function greetingFor(date) {
  let dateObj = new Date(date);
  if (isNaN(dateObj)) dateObj = new Date();
  const hStr = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false });
  const h = parseInt(hStr, 10) % 24;
  if (h < 5 || h >= 21) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

// "Today" / "August Month" / "1 Aug - 10 Aug" — whichever describes the
// selected range in the fewest words.
function rangeLabel(from, to) {
  if (from === TODAY && to === TODAY) return 'Today';
  const fromD = new Date(from + 'T00:00:00');
  const toD = new Date(to + 'T00:00:00');
  const lastDayOfMonth = new Date(fromD.getFullYear(), fromD.getMonth() + 1, 0).getDate();
  const isFullMonth = fromD.getDate() === 1
    && fromD.getFullYear() === toD.getFullYear()
    && fromD.getMonth() === toD.getMonth()
    && toD.getDate() === lastDayOfMonth;
  if (isFullMonth) return fromD.toLocaleDateString('en-US', { month: 'long' }) + ' Month';
  const short = (d) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  return `${short(fromD)} - ${short(toD)}`;
}

function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'In progress') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function Dashboard() {
  const { customers, orders, employees, invoices, passwordResetRequests, company, currencyRates, getCustomer } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [openMenuId, setOpenMenuId] = useState(null);
  const refDate = to;

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const todaysOrders = orders.filter((o) => o.date >= from && o.date <= to);
  const activeCount = customers.filter((c) => isActive(orders, c, refDate)).length;
  const pendingReview = orders.filter((o) => !o.invoiced && o.status === 'Completed').length;

  const monthPrefix = refDate.slice(0, 7); // 'YYYY-MM' of the range's end date
  const monthName = new Date(monthPrefix + '-01').toLocaleDateString('en-US', { month: 'long' });

  const defaultCcy = company?.defaultCurrency || 'PKR';
  const rangeTotals = {};
  todaysOrders.forEach((o) => { rangeTotals[o.currency] = (rangeTotals[o.currency] || 0) + o.price; });
  let totalIncomeConverted = 0;
  let totalIncomeUnknown = false;
  Object.entries(rangeTotals).forEach(([cc, v]) => {
    const converted = convertToDefault(v, cc, currencyRates, defaultCcy);
    if (converted == null) totalIncomeUnknown = true;
    else totalIncomeConverted += converted;
  });
  const totalIncomeStr = totalIncomeUnknown ? '—' : fmt(totalIncomeConverted, defaultCcy);

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
        <div className="elg-greeting">{greetingFor(to)} <span>👋</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          <span style={{ color: 'var(--elg-ink-3)', fontSize: 13 }}>to</span>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
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
          <div className="elg-metric-head"><span className="elg-metric-label">Ready to Invoice</span><span className="elg-metric-icon"><img src="/images/todays-invoice.svg" alt="" /></span></div>
          <div className="elg-metric-value">{pendingReview}</div>
          <div className="elg-metric-sub">Completed, not yet invoiced</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Total Income</span><span className="elg-metric-icon"><img src="/images/revenue.svg" alt="" /></span></div>
          <div className="elg-metric-value">{totalIncomeStr}</div>
          <div className="elg-metric-sub">{rangeLabel(from, to)}</div>
        </div>
      </div>

      <div className="elg-hint-line">
        For growth over time and custom date ranges, see the <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>Reports</a> page.
      </div>

      <div className="elg-panel">
        <div className="elg-section-head" style={{border : 0}}>
          <div className="elg-section-title">Recent Orders</div>
          <button className="elg-btn elg-view-all-btn" style={{ width: 'auto' }} onClick={() => navigate('/orders')}>View All</button>
        </div>
        <div className="elg-mobile-cards">
          {recent.length === 0 && <div className="elg-empty">No orders yet.</div>}
          {recent.map((o) => {
            const c = getCustomer(o.customerId);
            return (
              <div key={o.id} className="elg-mobile-card">
                <div className="elg-mobile-card-head" onClick={() => navigate(`/customers/${o.customerId}`)}>
                  <div className="elg-mobile-card-title">{o.name}</div>
                  <div className="elg-row-actions" onClick={(ev) => ev.stopPropagation()}>
                    <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                    {openMenuId === o.id && (
                      <div className="elg-row-menu">
                        <button onClick={() => { setOpenMenuId(null); openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' }); }}>
                          <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                        </button>
                        <button className="elg-btn-danger-text" onClick={() => { setOpenMenuId(null); openModal(<ConfirmDeleteOrderModal order={o} />, { variant: 'elegant' }); }}>
                          <img src="/icons/delete-red-icon.svg" alt="Delete" width="14" height="14" /> Delete order
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="elg-mobile-card-row"><PersonIcon width={14} height={14} />{c ? c.company : '—'}</div>
                <div className="elg-mobile-card-row"><CoinIcon width={14} height={14} />{SYM[o.currency]}{commissionAmt(o).toFixed(2)} Commission ({o.commissionRate}%)</div>
                <div className="elg-mobile-card-foot">
                  <span className={`elg-badge ${elgStatusClass(o.status)}`}>{o.status}</span>
                  <span className="elg-mobile-card-price">{SYM[o.currency]}{o.price.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="elg-table-wrap">
          <table className="elg-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Currency</th><th>Price</th><th>Commission</th><th  style={{minWidth : "150px"}}>Action</th></tr></thead>
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
                        <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                        {openMenuId === o.id && (
                          <div className="elg-row-menu">
                            <button onClick={() => { setOpenMenuId(null); openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' }); }}>
                              <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                            </button>
                            <button className="elg-btn-danger-text" onClick={() => { setOpenMenuId(null); openModal(<ConfirmDeleteOrderModal order={o} />, { variant: 'elegant' }); }}>
                              <img src="/icons/delete-red-icon.svg" alt="Delete" width="14" height="14" /> Delete order
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

      <MobileFab
        onAddOrder={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}
        onAddCustomer={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}
        onAddEmployee={() => openModal(<EmployeeFormModal />, { variant: 'elegant' })}
      />
    </div>
  );
}
