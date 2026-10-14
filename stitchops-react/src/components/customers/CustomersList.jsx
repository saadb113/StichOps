import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { isActive, matchesSearch } from '../../lib/helpers';
import CustomerFormModal from './CustomerFormModal';
import OrderFormModal from '../orders/OrderFormModal';
import EmployeeFormModal from '../employees/EmployeeFormModal';
import MobileFilterModal from '../layout/MobileFilterModal';
import MobileFab from '../layout/MobileFab';
import RangeDateField from '../common/RangeDateField';
import { SearchIcon, UserPlusIcon, FilterIcon, PersonIcon, PlusIcon, LocationIcon, PeopleIcon } from '../icons/Icon';

function initialsFor(name) {
  return name.split(' ').filter((w) => /[a-z0-9]/i.test(w[0])).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function customerTypeClass(status) {
  if (status === 'Paid') return 'elg-badge-completed';
  return 'elg-badge-inprogress';
}

export default function CustomersList() {
  const { customers, orders, invoices, isAdmin, currentEmployee } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [salesperson, setSalesperson] = useState('');
  // Only meaningful (and only shown) alongside the Inactive status filter —
  // changing status away from Inactive clears it so it can't silently keep
  // narrowing the list once it's hidden again.
  const [paymentFilter, setPaymentFilter] = useState('');

  function handleStatusChange(next) {
    setStatus(next);
    if (next !== 'Inactive') setPaymentFilter('');
  }

  function hasUnpaidInvoice(customerId) {
    return invoices.some((i) => i.customerId === customerId && i.status === 'approved' && i.paymentStatus !== 'Completed');
  }

  const base = isAdmin ? customers : customers.filter((c) => c.salesperson === currentEmployee?.name);
  const countries = [...new Set(base.map((c) => c.country))].sort();
  let statsBase = search.trim() ? base.filter((c) => matchesSearch(search, c.name, c.company, c.customerCode, c.email, c.salesperson)) : base;
  const salespeople = [...new Set(base.map((c) => c.salesperson).filter(Boolean))].sort();
  const salespersonCount = salesperson ? base.filter((c) => c.salesperson === salesperson).length : 0;
  if (salesperson) statsBase = statsBase.filter((c) => c.salesperson === salesperson);
  if (customerType) statsBase = statsBase.filter((c) => c.status === customerType);
  if (country) statsBase = statsBase.filter((c) => c.country === country);
  if (from) statsBase = statsBase.filter((c) => c.createdAt && c.createdAt.slice(0, 10) >= from);
  if (to) statsBase = statsBase.filter((c) => c.createdAt && c.createdAt.slice(0, 10) <= to);

  // The overview cards summarize the same filtered set the table shows, but
  // never the Active/Inactive status dropdown — picking one to narrow the
  // table shouldn't zero out the other card's count.
  const activeCount = statsBase.filter((c) => isActive(orders, c)).length;
  const inactiveCount = statsBase.length - activeCount;
  const freeTrialCount = statsBase.filter((c) => c.status === 'Free Trial').length;

  let list = status ? statsBase.filter((c) => (isActive(orders, c) ? 'Active' : 'Inactive') === status) : statsBase;
  if (status === 'Inactive' && paymentFilter) {
    list = list.filter((c) => (paymentFilter === 'Unpaid' ? hasUnpaidInvoice(c.id) : !hasUnpaidInvoice(c.id)));
  }

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
          <div className="elg-page-sub">{isAdmin ? (salesperson ? `${salespersonCount} customer${salespersonCount === 1 ? '' : 's'} from ${salesperson}` : `${customers.length} profile${customers.length === 1 ? '' : 's'} listed`) : `${base.length} customer${base.length === 1 ? '' : 's'} assigned to you`}</div>
        </div>
        <div className="elg-page-head-range">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} align="right" />
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-filterbar-actions">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <select className="elg-select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {status === 'Inactive' && (
            <select className="elg-select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          )}
          {isAdmin && (
            <select className="elg-select" value={salesperson} onChange={(e) => setSalesperson(e.target.value)}>
              <option value="">All Salespeople</option>
              {salespeople.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select className="elg-select" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}>
            <img src="/images/addCustomerBtn.svg" alt="" /> Add Customer
          </button>
        </div>
        <button
          className="elg-mobile-filter-btn"
          title="Filter"
          onClick={() => openModal(
            <MobileFilterModal
              title="Filter Customers"
              fields={[
                { key: 'customerType', label: 'Customer Type', allLabel: 'All Customer Types', options: [{ value: 'Free Trial', label: 'Free Trial' }, { value: 'Paid', label: 'Paid' }] },
                { key: 'status', label: 'Status', allLabel: 'All Status', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
                ...(status === 'Inactive' ? [{ key: 'paymentFilter', label: 'Payment', allLabel: 'All Payments', options: [{ value: 'Paid', label: 'Paid' }, { value: 'Unpaid', label: 'Unpaid' }] }] : []),
                ...(isAdmin ? [{ key: 'salesperson', label: 'Salesperson', allLabel: 'All Salespeople', options: salespeople.map((s) => ({ value: s, label: s })) }] : [])
              ]}
              values={{ customerType, status, paymentFilter, salesperson }}
              onApply={(v) => { setCustomerType(v.customerType); handleStatusChange(v.status); setPaymentFilter(v.status === 'Inactive' ? (v.paymentFilter || '') : ''); setSalesperson(v.salesperson || ''); }}
            />,
            { variant: 'elegant' }
          )}
        >
          <FilterIcon />
        </button>
      </div>

      <div className="elg-mobile-country-chips">
        <button className={`elg-mobile-country-chip ${!country ? 'active' : ''}`} onClick={() => setCountry('')}>All</button>
        {countries.map((c) => (
          <button key={c} className={`elg-mobile-country-chip ${country === c ? 'active' : ''}`} onClick={() => setCountry(c)}>{c}</button>
        ))}
      </div>

      <div className="elg-mobile-filter-chips">
        {customerType && <span className="elg-mobile-filter-chip">{customerType}<button onClick={() => setCustomerType('')}>&times;</button></span>}
        {status && <span className="elg-mobile-filter-chip">{status}<button onClick={() => handleStatusChange('')}>&times;</button></span>}
        {status === 'Inactive' && paymentFilter && <span className="elg-mobile-filter-chip">{paymentFilter}<button onClick={() => setPaymentFilter('')}>&times;</button></span>}
        {salesperson && <span className="elg-mobile-filter-chip">{salesperson}<button onClick={() => setSalesperson('')}>&times;</button></span>}
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
        {list.length === 0 && (
          <div className="elg-empty">
            {search || customerType || status || country || salesperson || from || to ? 'No customers match these filters.' : 'No customers yet — add your first customer to get started.'}
          </div>
        )}
        {list.map((c) => {
          const active = isActive(orders, c);
          return (
            <div key={c.id} className="elg-mobile-card clickable" onClick={() => navigate(`${basePath}/${c.id}`)}>
              <div className="elg-mobile-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="elg-mobile-avatar">{initialsFor(c.company)}</span>
                  <div>
                    <div className="elg-mobile-card-title">{c.company}</div>
                    <div className="elg-mobile-card-subtitle">{c.customerCode || '—'}</div>
                  </div>
                </div>
                <span className={`elg-badge ${active ? 'elg-badge-active' : 'elg-badge-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="elg-mobile-card-row"><PersonIcon width={14} height={14} />{c.name}</div>
              <div className="elg-mobile-card-row"><LocationIcon />{c.country}</div>
            </div>
          );
        })}
      </div>

      <MobileFab
        onAddOrder={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}
        onAddCustomer={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}
        onAddEmployee={() => openModal(<EmployeeFormModal />, { variant: 'elegant' })}
      />

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
                {search || customerType || status || country || salesperson || from || to ? 'No customers match these filters.' : 'No customers yet — add your first customer to get started.'}
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
                  {isAdmin && <td>{c.salesperson || '—'}</td>}
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
