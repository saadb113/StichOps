import { NavLink, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import OrderFormModal from '../orders/OrderFormModal';
import CustomerFormModal from '../customers/CustomerFormModal';
import {
  DashboardIcon, BagIcon, DocIcon, PeopleIcon, PersonIcon, ChartIcon, GearIcon,
  PlusIcon, UserPlusIcon, ShieldIcon
} from '../icons/Icon';

const ADMIN_NAV = [
  ['/dashboard', 'Dashboard', DashboardIcon],
  ['/orders', 'Orders', BagIcon],
  ['/invoices', 'Invoices', DocIcon],
  ['/customers', 'Customers', PeopleIcon],
  ['/employees', 'Employees', PersonIcon]
];
const ADMIN_NAV_2 = [
  ['/reports', 'Reports', ChartIcon],
  ['/settings', 'Company settings', GearIcon]
];
const SALES_NAV = [
  ['/my-customers', 'My Customers', PeopleIcon],
  ['/my-payslip', 'My Payslip', DocIcon],
  ['/my-info', 'My Info', PersonIcon]
];

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, orders, passwordResetRequests } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();

  function renderNavItem([path, label, Icon]) {
    return (
      <NavLink
        key={path}
        to={path}
        onClick={onNavigate}
        className={({ isActive }) => `elg-nav-item ${isActive ? 'active' : ''}`}
      >
        <Icon width={17} height={17} />
        {label}
        {path === '/orders' && orders.length > 0 && <span className="elg-nav-badge">{orders.length}</span>}
      </NavLink>
    );
  }

  return (
    <div id="sidebar" className={`elg-sidebar ${open ? 'open' : ''}`}>
      <div className="elg-logo">
        <div className="elg-logo-mark"><BagIcon width={16} height={16} /></div>
        <div className="elg-logo-text">
          <div className="l1">The Elegants</div>
          <div className="l2">Design Ltd.</div>
        </div>
      </div>

      {isAdmin && (
        <div className="elg-sidebar-actions">
          <button className="elg-btn elg-btn-primary" onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
            <PlusIcon /> Add Order
          </button>
          <button className="elg-btn" onClick={() => openModal(<CustomerFormModal />)}>
            <UserPlusIcon /> Add Customer
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
          <div className="elg-attention-icon"><ShieldIcon width={18} height={18} /></div>
          <div className="elg-attention-text">
            '{passwordResetRequests.length}' password reset request{passwordResetRequests.length > 1 ? 's' : ''} need{passwordResetRequests.length > 1 ? '' : 's'} your attention
          </div>
          <button className="elg-attention-btn" onClick={() => { navigate('/employees'); if (onNavigate) onNavigate(); }}>Review</button>
        </div>
      )}
    </div>
  );
}
