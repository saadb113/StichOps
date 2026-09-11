import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import OrderFormModal from '../orders/OrderFormModal';
import CustomerFormModal from '../customers/CustomerFormModal';
import {
  PeopleIcon, DocIcon, PersonIcon,
  PeopleIconActive, DocIconActive, PersonIconActive,
  PlusIcon, UserPlusIcon, ShieldIcon, CloseIcon, ArrowLeftIcon, LogoutIcon
} from '../icons/Icon';

// These three live in the bottom tab bar on mobile, so the drawer only
// needs to surface the rest of the nav.
const MOBILE_HIDDEN_PATHS = ['/dashboard', '/orders', '/invoices'];

const elegantsLogo = '/images/elegants-logo-svg.svg';

const DashboardIcon = '/icons/dashboard-icon.svg';
const DashboardIconActive = '/icons/dashboard-icon-active.svg';
const OrdersIcon = '/icons/orders-icon.svg';
const OrdersIconActive = '/icons/orders-icon-active.svg';
const InvoicesIcon = '/icons/invoices-icon.svg';
const InvoicesIconActive = '/icons/invoices-icon-active.svg';
const CustomersIcon = '/icons/customer-icon.svg';
const CustomersIconActive = '/icons/customer-icon-active.svg';
const EmployeesIcon = '/icons/employees-icon.svg';
const EmployeesIconActive = '/icons/employees-icon-active.svg';
const ReportsIcon = '/icons/report-icon.svg';
const ReportsIconActive = '/icons/report-icon-active.svg';
const SettingsIcon = '/icons/settings-icon.svg';
const SettingsIconActive = '/icons/settings-icon-active.svg';

const AddOrder = '/icons/add-icon.svg';
const AddCustomer = '/icons/add-customer-icon.svg';

const salesCustomerIcon = '/images/sales-customer-icon.svg';
const salesCustomerIconActive = '/images/sales-customer-icon-active.svg';
const salesPayslipIcon = '/images/sales-payslip-icon.svg';
const salesPayslipIconActive = '/images/sales-payslip-icon-active.svg';
const salesInfoIcon = '/images/sales-about-icon.svg';
const salesInfoIconActive = '/images/sales-about-icon-active.svg';

const notificationsIcon = '/images/important-notifications-icon.png';

const ADMIN_NAV = [
  ['/dashboard', 'Dashboard', DashboardIcon, DashboardIconActive],
  ['/orders', 'Orders', OrdersIcon, OrdersIconActive],
  ['/invoices', 'Invoices', InvoicesIcon, InvoicesIconActive],
  ['/customers', 'Customers', CustomersIcon, CustomersIconActive],
  ['/employees', 'Employees', EmployeesIcon, EmployeesIconActive]
];
const ADMIN_NAV_2 = [
  ['/reports', 'Reports', ReportsIcon, ReportsIconActive],
  ['/settings', 'Settings', SettingsIcon, SettingsIconActive]
];
// No custom icon files for these yet — keep the built-in component icons
// until matching SVGs are added to public/icons/.
const SALES_NAV = [
  ['/my-customers', 'Customers', salesCustomerIcon, salesCustomerIconActive],
  ['/my-payslip', 'Payslip', salesPayslipIcon, salesPayslipIconActive]
];
const SALES_NAV_2 = [
  ['/my-info', 'My Info', salesInfoIcon, salesInfoIconActive]
];

// Icon entries can be either a React component (from icons/Icon.jsx) or a
// string URL to a custom SVG in public/icons/ — this renders whichever it gets.
function NavIcon({ icon, width, height }) {
  if (typeof icon === 'string') return <img src={icon} width={width} height={height} alt="" />;
  const Icon = icon;
  return <Icon width={width} height={height} />;
}

// Card key -> close icon, hides that attention card for the rest of the
// session. There's no cron in this app, so "today" is re-derived from the
// employee/customer list on every render rather than stored anywhere.
function AttentionCard({ cardKey, dismissed, onDismiss, children }) {
  if (dismissed) return null;
  return (
    <div className="elg-attention-card">
      <div className="elg-attention-content">
        <button className="elg-attention-close" title="Dismiss" onClick={() => onDismiss(cardKey)}>
          <CloseIcon width={14} height={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, orders, invoices, employees, customers, passwordResetRequests, logout } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const pendingOrderCount = orders.filter((o) => o.status === 'Pending' || o.status === 'In progress').length;
  const unpaidInvoiceCount = invoices.filter((i) => i.paymentStatus !== 'Completed').length;
  const [dismissedCards, setDismissedCards] = useState({});
  const dismissCard = (key) => setDismissedCards((d) => ({ ...d, [key]: true }));

  const todayDate = new Date().getDate();
  const payoutDueEmployees = employees.filter((e) => e.payoutDay === todayDate);
  const invoiceDueCustomers = customers.filter((c) => c.invoiceDay === todayDate);

  function renderNavItem([path, label, Icon, ActiveIcon]) {
    const mobileHide = MOBILE_HIDDEN_PATHS.includes(path);
    return (
      <NavLink
        key={path}
        to={path}
        onClick={onNavigate}
        className={({ isActive }) => `elg-nav-item ${isActive ? 'active' : ''} ${mobileHide ? 'elg-nav-mobile-hide' : ''}`}
      >
        {({ isActive }) => {
          const displayIcon = isActive && ActiveIcon ? ActiveIcon : Icon;
          return (
            <>
              <NavIcon icon={displayIcon} width={17} height={17} />
              {label}
              {path === '/orders' && pendingOrderCount > 0 && <span className="elg-nav-badge">{pendingOrderCount}</span>}
              {path === '/invoices' && unpaidInvoiceCount > 0 && <span className="elg-nav-badge">{unpaidInvoiceCount}</span>}
            </>
          );
        }}
      </NavLink>
    );
  }

  return (
    <div id="sidebar" className={`elg-sidebar ${open ? 'open' : ''}`}>
      <div className="elg-logo">
        <img src={elegantsLogo} alt="StitchOps" />
        <button className="elg-sidebar-close" onClick={onNavigate} aria-label="Close menu">
          <ArrowLeftIcon width={18} height={18} />
        </button>
      </div>

      {isAdmin && (
        <div className="elg-sidebar-actions">
          <button className="elg-btn elg-btn-primary" style={{fontWeight: 500}} onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
            <img src={AddOrder} alt="Add Order" /> Add Order
          </button>
          <button className="elg-customer-btn" onClick={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}>
            <img src={AddCustomer} alt="Add Customer" /> Add Customer
          </button>
        </div>
      )}

      <div className="elg-nav">
        {(isAdmin ? ADMIN_NAV : SALES_NAV).map(renderNavItem)}
        {isAdmin && (
          <>
            <div className="elg-nav-divider"></div>
            {ADMIN_NAV_2.map(renderNavItem)}
          </>
        )}
        {!isAdmin && (
          <>
            <div className="elg-nav-divider"></div>
            {SALES_NAV_2.map(renderNavItem)}
          </>
        )}
      </div>

      {isAdmin && passwordResetRequests.length > 0 && (
        <AttentionCard cardKey="reset" dismissed={dismissedCards.reset} onDismiss={dismissCard}>
          <div className="elg-attention-icon">
            <img src={notificationsIcon} width={60} height={60} alt="Attention" />
          </div>
          <div className="elg-attention-text">
            '{passwordResetRequests.length}' password reset request{passwordResetRequests.length > 1 ? 's' : ''} need{passwordResetRequests.length > 1 ? '' : 's'} your attention
          </div>
          <button className="elg-attention-btn" onClick={() => { navigate('/employees'); if (onNavigate) onNavigate(); }}>Review</button>
        </AttentionCard>
      )}

      {isAdmin && payoutDueEmployees.length > 0 && (
        <AttentionCard cardKey="payout" dismissed={dismissedCards.payout} onDismiss={dismissCard}>
          <div className="elg-attention-icon">
            <img src={notificationsIcon} width={60} height={60} alt="Attention" />
          </div>
          <div className="elg-attention-text">
            Today is the payout day for '{payoutDueEmployees.length}' employee{payoutDueEmployees.length > 1 ? 's' : ''}
          </div>
          <button className="elg-attention-btn" onClick={() => { navigate('/employees'); if (onNavigate) onNavigate(); }}>Review</button>
        </AttentionCard>
      )}

      {isAdmin && invoiceDueCustomers.length > 0 && (
        <AttentionCard cardKey="invoice" dismissed={dismissedCards.invoice} onDismiss={dismissCard}>
          <div className="elg-attention-icon">
            <img src={notificationsIcon} width={60} height={60} alt="Attention" />
          </div>
          <div className="elg-attention-text">
            '{invoiceDueCustomers.length}' customer{invoiceDueCustomers.length > 1 ? 's have' : ' has'} their invoice day today
          </div>
          <button className="elg-attention-btn" onClick={() => { navigate('/invoices?dueToday=1'); if (onNavigate) onNavigate(); }}>Check Invoices</button>
        </AttentionCard>
      )}

      <button className="elg-sidebar-logout" onClick={logout}>
        <LogoutIcon width={16} height={16} /> Logout
      </button>
    </div>
  );
}
