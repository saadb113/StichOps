import { NavLink, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import OrderFormModal from '../orders/OrderFormModal';
import CustomerFormModal from '../customers/CustomerFormModal';
import {
  PeopleIcon, DocIcon, PersonIcon,
  PeopleIconActive, DocIconActive, PersonIconActive,
  PlusIcon, UserPlusIcon, ShieldIcon
} from '../icons/Icon';

const elegantsLogo = '/images/elegant-designs-logo.svg';

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
  ['/my-customers', 'My Customers', PeopleIcon, PeopleIconActive],
  ['/my-payslip', 'My Payslip', DocIcon, DocIconActive],
  ['/my-info', 'My Info', PersonIcon, PersonIconActive]
];

// Icon entries can be either a React component (from icons/Icon.jsx) or a
// string URL to a custom SVG in public/icons/ — this renders whichever it gets.
function NavIcon({ icon, width, height }) {
  if (typeof icon === 'string') return <img src={icon} width={width} height={height} alt="" />;
  const Icon = icon;
  return <Icon width={width} height={height} />;
}

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, orders, passwordResetRequests } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();

  function renderNavItem([path, label, Icon, ActiveIcon]) {
    return (
      <NavLink
        key={path}
        to={path}
        onClick={onNavigate}
        className={({ isActive }) => `elg-nav-item ${isActive ? 'active' : ''}`}
      >
        {({ isActive }) => {
          const displayIcon = isActive && ActiveIcon ? ActiveIcon : Icon;
          return (
            <>
              <NavIcon icon={displayIcon} width={17} height={17} />
              {label}
              {path === '/orders' && orders.length > 0 && <span className="elg-nav-badge">{orders.length}</span>}
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
      </div>

      {isAdmin && (
        <div className="elg-sidebar-actions">
          <button className="elg-btn elg-btn-primary" onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
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
      </div>

      {isAdmin && passwordResetRequests.length > 0 && (
        <div className="elg-attention-card">
          <div className="elg-attention-content">
            <div className="elg-attention-icon">
              <img src={notificationsIcon} width={60} height={60} alt="Attention" />
            </div>
            <div className="elg-attention-text">
              '{passwordResetRequests.length}' password reset request{passwordResetRequests.length > 1 ? 's' : ''} need{passwordResetRequests.length > 1 ? '' : 's'} your attention
            </div>
            <button className="elg-attention-btn" onClick={() => { navigate('/employees'); if (onNavigate) onNavigate(); }}>Review</button>
          </div>
        </div>
      )}
    </div>
  );
}
