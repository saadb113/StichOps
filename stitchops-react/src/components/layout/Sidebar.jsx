import { NavLink } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

const ADMIN_NAV = [
  ['/dashboard', 'Dashboard'],
  ['/orders', 'Orders'],
  ['/invoices', 'Invoices'],
  ['/customers', 'Customers'],
  ['/employees', 'Employees'],
  ['/reports', 'Reports'],
  ['/settings', 'Company settings']
];
const SALES_NAV = [
  ['/my-customers', 'My Customers'],
  ['/my-payslip', 'My Payslip'],
  ['/my-info', 'My Info']
];

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, currentUser, logout } = useAppState();
  const nav = isAdmin ? ADMIN_NAV : SALES_NAV;

  return (
    <div id="sidebar" className={open ? 'open' : ''}>
      <div className="brand">Stitch<span>Ops</span></div>
      {nav.map(([path, label]) => (
        <NavLink
          key={path}
          to={path}
          onClick={onNavigate}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-dot"></span>{label}
        </NavLink>
      ))}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div style={{ padding: '0 10px 8px', fontSize: '11.5px', color: 'var(--ink-3)' }}>{currentUser.email}</div>
        <div className="nav-item" onClick={logout}><span className="nav-dot"></span>Log out</div>
      </div>
    </div>
  );
}
