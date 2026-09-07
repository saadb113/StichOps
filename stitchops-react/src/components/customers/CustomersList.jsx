import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { isActive } from '../../lib/helpers';
import CustomerFormModal from './CustomerFormModal';
import { SearchIcon, UserPlusIcon } from '../icons/Icon';

function customerTypeClass(status) {
  if (status === 'Paid') return 'elg-badge-completed';
  return 'elg-badge-inprogress';
}

export default function CustomersList() {
  const { customers, orders, isAdmin, currentEmployee } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const base = isAdmin ? customers : customers.filter((c) => c.salesperson === currentEmployee?.name);
  const countries = [...new Set(base.map((c) => c.country))].sort();
  const q = search.toLowerCase();
  let list = q ? base.filter((c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)) : base;
  if (customerType) list = list.filter((c) => c.status === customerType);
  if (status) list = list.filter((c) => (isActive(orders, c) ? 'Active' : 'Inactive') === status);
  if (country) list = list.filter((c) => c.country === country);
  if (from) list = list.filter((c) => c.createdAt && c.createdAt.slice(0, 10) >= from);
  if (to) list = list.filter((c) => c.createdAt && c.createdAt.slice(0, 10) <= to);

  const basePath = isAdmin ? '/customers' : '/my-customers';

  return (
    <div className="elg-page">
      {isAdmin && <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate(isAdmin ? '/dashboard' : basePath)}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">{isAdmin ? 'Customers' : 'My Customers'}</span>
      </div>}

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">{isAdmin ? 'Customers' : 'My Customers'}</div>
          <div className="elg-page-sub">{isAdmin ? `${customers.length} profile${customers.length === 1 ? '' : 's'} listed` : `${base.length} customer${base.length === 1 ? '' : 's'} assigned to you`}</div>
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-date-range-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          <span style={{ color: 'var(--elg-ink-3)', fontSize: 13 }}>to</span>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.svg" alt="" />
          </span>
          {(from || to) && <button className="elg-date-clear" title="Clear dates" onClick={() => { setFrom(''); setTo(''); }}>&times;</button>}
        </div>
        <select className="elg-select" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
          <option value="">All Customer Types</option>
          <option value="Free Trial">Free Trial</option>
          <option value="Paid">Paid</option>
        </select>
        <select className="elg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select className="elg-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}>
          <img src="/images/addCustomerBtn.svg" alt="" /> Add Customer
        </button>
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead>
            <tr>
              <th>ID</th><th>Company</th><th>Contact</th><th>Country</th><th>Currency</th><th>Customer Type</th>
              {isAdmin && <th>Salesperson</th>}
              <th style={{minWidth : "150px"}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={isAdmin ? 8 : 7} className="elg-empty">
                {search || customerType || status || country || from || to ? 'No customers match these filters.' : 'No customers yet — add your first customer to get started.'}
              </td></tr>
            )}
            {list.map((c) => {
              const active = isActive(orders, c);
              return (
                <tr className="clickable" key={c.id} onClick={() => navigate(`${basePath}/${c.id}`)}>
                  <td style={{ fontSize: 12.5 }}>{c.customerCode || '—'}</td>
                  <td style={{ fontWeight: 400 }}>{c.company}</td>
                  <td>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.currency}</td>
                  <td><span className={`elg-badge ${customerTypeClass(c.status)}`}>{c.status}</span></td>
                  {isAdmin && <td>{c.salesperson}</td>}
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
