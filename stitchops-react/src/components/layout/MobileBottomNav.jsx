import { NavLink } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

const DashboardIconImg = '/icons/dashboard-icon.svg';
const DashboardIconActiveImg = '/icons/dashboard-icon-active.svg';
const OrdersIconImg = '/icons/orders-icon.svg';
const OrdersIconActiveImg = '/icons/orders-icon-active.svg';
const InvoicesIconImg = '/icons/invoices-icon.svg';
const InvoicesIconActiveImg = '/icons/invoices-icon-active.svg';

const TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIconImg, active: DashboardIconActiveImg },
  { to: '/orders', label: 'Orders', icon: OrdersIconImg, active: OrdersIconActiveImg },
  { to: '/invoices', label: 'Invoices', icon: InvoicesIconImg, active: InvoicesIconActiveImg }
];

function MoreIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--elg-primary)' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// The 4th tab ("More") doesn't navigate — it opens the same drawer as the
// desktop sidebar, so it's driven by the menu-open state Layout already owns.
export default function MobileBottomNav({ menuOpen, onToggleMenu }) {
  const { orders, invoices, passwordResetRequests, employees, customers } = useAppState();
  const pendingOrderCount = orders.filter((o) => o.status === 'Pending' || o.status === 'In progress').length;
  const unpaidInvoiceCount = invoices.filter((i) => i.paymentStatus !== 'Completed').length;
  const badges = { '/orders': pendingOrderCount, '/invoices': unpaidInvoiceCount };

  const todayDate = new Date().getDate();
  const hasAttention = passwordResetRequests.length > 0
    || employees.some((e) => e.payoutDay === todayDate)
    || customers.some((c) => c.invoiceDay === todayDate);

  return (
    <div className="elg-mobile-bottom-nav">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `elg-mobile-tab ${isActive && !menuOpen ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              <span className="elg-mobile-tab-icon-wrap">
                <img src={isActive && !menuOpen ? t.active : t.icon} alt="" />
                {badges[t.to] > 0 && <span className="elg-mobile-tab-badge" />}
              </span>
              {t.label}
            </>
          )}
        </NavLink>
      ))}
      <button className={`elg-mobile-tab ${menuOpen ? 'active' : ''}`} onClick={onToggleMenu}>
        <span className="elg-mobile-tab-icon-wrap">
          <MoreIcon active={menuOpen} />
          {hasAttention && <span className="elg-mobile-tab-badge" />}
        </span>
        More
      </button>
    </div>
  );
}
