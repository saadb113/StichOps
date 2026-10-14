import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { isActive, matchesSearch } from '../../lib/helpers';
import CustomerFormModal from '../customers/CustomerFormModal';
import RangeDateField from '../common/RangeDateField';
import { PeopleIcon, PersonIcon, LocationIcon, UserPlusIcon } from '../icons/Icon';

function customerTypeClass(status) {
  if (status === 'Paid') return 'elg-badge-completed';
  return 'elg-badge-inprogress';
}

// Mirrors the main Customers list (filters, overview cards, table), but
// scoped to one salesperson's own book — shown as a tab on their profile
// page so admin can see exactly what CustomersList shows that salesperson,
// without leaving the employee record.
export default function EmployeeCustomersTab({ employee }) {
  const { customers, orders } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const base = customers.filter((c) => c.salesperson === employee.name);
  const countries = [...new Set(base.map((c) => c.country))].sort();

  let statsBase = search.trim() ? base.filter((c) => matchesSearch(search, c.name, c.company, c.customerCode, c.email)) : base;
  if (country) statsBase = statsBase.filter((c) => c.country === country);
  if (from) statsBase = statsBase.filter((c) => c.createdAt && c.createdAt.slice(0, 10) >= from);
  if (to) statsBase = statsBase.filter((c) => c.createdAt && c.createdAt.slice(0, 10) <= to);

  const activeCount = statsBase.filter((c) => isActive(orders, c)).length;
  const inactiveCount = statsBase.length - activeCount;
  const freeTrialCount = statsBase.filter((c) => c.status === 'Free Trial').length;

  const list = status ? statsBase.filter((c) => (isActive(orders, c) ? 'Active' : 'Inactive') === status) : statsBase;

  return (
    <div>
      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-filterbar-actions">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <select className="elg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select className="elg-select" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="elg-btn elg-btn-primary"
            style={{ width: 'auto', whiteSpace: 'nowrap' }}
            onClick={() => openModal(<CustomerFormModal presetSalesperson={employee.name} />, { variant: 'elegant' })}
          >
            <img alt="" src="/images/addCustomerBtn.svg" /> Add Customer
          </button>
        </div>
      </div>

      <div className="elg-metric-grid">
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Total Customers</span><span className="elg-metric-icon"><img src="/images/active-customer.svg"   alt="" /></span></div>
          <div className="elg-metric-value">{statsBase.length}</div>
          <div className="elg-metric-sub">Across all countries</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Active Customers</span><span className="elg-metric-icon"><img src="/images/active-customers.svg"   alt="" /></span></div>
          <div className="elg-metric-value">{activeCount}</div>
          <div className="elg-metric-sub">Out of {statsBase.length}</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Inactive Customers</span><span className="elg-metric-icon"><img src="/images/inactive-customers.svg"   alt="" /></span></div>
          <div className="elg-metric-value">{inactiveCount}</div>
          <div className="elg-metric-sub">Out of {statsBase.length}</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Free Trial Customers</span><span className="elg-metric-icon"><img src="/images/free-trial-customers.svg"   alt="" /></span></div>
          <div className="elg-metric-value">{freeTrialCount}</div>
          <div className="elg-metric-sub">Across all countries</div>
        </div>
      </div>

      <div className="elg-mobile-cards">
        {list.length === 0 && <div className="elg-empty">No customers match these filters.</div>}
        {list.map((c) => {
          const active = isActive(orders, c);
          return (
            <div key={c.id} className="elg-mobile-card clickable" onClick={() => navigate(`/customers/${c.id}`)}>
              <div className="elg-mobile-card-head">
                <div>
                  <div className="elg-mobile-card-title">{c.company}</div>
                  <div className="elg-mobile-card-subtitle">{c.customerCode || '—'}</div>
                </div>
                <span className={`elg-badge ${active ? 'elg-badge-active' : 'elg-badge-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="elg-mobile-card-row"><PersonIcon width={14} height={14} />{c.name}</div>
              <div className="elg-mobile-card-row"><LocationIcon />{c.country}</div>
            </div>
          );
        })}
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead>
            <tr><th>ID</th><th>Company</th><th>Contact</th><th>Country</th><th>Currency</th><th>Status</th></tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="elg-empty">No customers match these filters.</td></tr>
            )}
            {list.map((c) => {
              const active = isActive(orders, c);
              return (
                <tr className="clickable" key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                  <td style={{ fontSize: 12.5 }}>{c.customerCode || '—'}</td>
                  <td style={{ fontWeight: 400 }}>{c.company}</td>
                  <td>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.currency}</td>
                  <td><span className={`elg-badge ${active ? 'elg-badge-active' : 'elg-badge-inactive'}`}>{active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
