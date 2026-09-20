import { NavLink } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

const DashboardIconImg = '/icons/dashboard-icon.svg';
const DashboardIconActiveImg = '/icons/dashboard-icon-active.svg';
const OrdersIconImg = '/icons/orders-icon.svg';
const OrdersIconActiveImg = '/icons/orders-icon-active.svg';
const InvoicesIconImg = '/icons/invoices-icon.svg';
const InvoicesIconActiveImg = '/icons/invoices-icon-active.svg';

const salesCustomerIcon = '/images/sales-customer-icon.svg';
const salesCustomerIconActive = '/images/sales-customer-icon-active.svg';
const salesPayslipIcon = '/images/sales-payslip-icon.svg';
const salesPayslipIconActive = '/images/sales-payslip-icon-active.svg';
const salesInfoIcon = '/images/sales-about-icon.svg';
const salesInfoIconActive = '/images/sales-about-icon-active.svg';

const ADMIN_TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIconImg, active: DashboardIconActiveImg },
  { to: '/orders', label: 'Orders', icon: OrdersIconImg, active: OrdersIconActiveImg },
  { to: '/invoices', label: 'Invoices', icon: InvoicesIconImg, active: InvoicesIconActiveImg }
];

// Salespeople get their own customers; Designers/other-team employees
// don't own customers, so that tab is left out for them — same split as
// the desktop sidebar (Sidebar.jsx SALES_NAV).
const SALES_TABS = [
  { to: '/my-customers', label: 'Customers', icon: salesCustomerIcon, active: salesCustomerIconActive },
  { to: '/my-payslip', label: 'Payslip', icon: salesPayslipIcon, active: salesPayslipIconActive },
  { to: '/my-info', label: 'My Info', icon: salesInfoIcon, active: salesInfoIconActive }
];
const EMPLOYEE_TABS = [
  { to: '/my-payslip', label: 'Payslip', icon: salesPayslipIcon, active: salesPayslipIconActive },
  { to: '/my-info', label: 'My Info', icon: salesInfoIcon, active: salesInfoIconActive }
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
// Only admins get it: their nav has more items than fit in the bar, while
// the self-service nav (Salesperson/Designer/other team) fits entirely in
// 2-3 tabs already, so there's nothing left to put behind "More".
export default function MobileBottomNav({ menuOpen, onToggleMenu }) {
  const { isAdmin, isSalesperson, orders, invoices, passwordResetRequests, employees, customers } = useAppState();

  const tabs = isAdmin ? ADMIN_TABS : (isSalesperson ? SALES_TABS : EMPLOYEE_TABS);

  const pendingOrderCount = orders.filter((o) => o.status === 'Pending' || o.status === 'In progress').length;
  const unpaidInvoiceCount = invoices.filter((i) => i.paymentStatus !== 'Completed').length;
  const badges = { '/orders': pendingOrderCount, '/invoices': unpaidInvoiceCount };

  const todayDate = new Date().getDate();
  const hasAttention = isAdmin && (
    passwordResetRequests.length > 0
    || employees.some((e) => e.payoutDay === todayDate)
    || customers.some((c) => c.invoiceDay === todayDate)
  );

  return (
    <div className="elg-mobile-bottom-nav">
      {tabs.map((t) => (
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
      {isAdmin && (
        <button className={`elg-mobile-tab ${menuOpen ? 'active' : ''}`} onClick={onToggleMenu}>
          <span className="elg-mobile-tab-icon-wrap">
            <MoreIcon active={menuOpen} />
            {hasAttention && <span className="elg-mobile-tab-badge" />}
          </span>
          More
        </button>
      )}
    </div>
  );
}
