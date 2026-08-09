import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, unpaidAmountFor } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeSettingsMenuModal from './EmployeeSettingsMenuModal';
import AddCategoryModal from './AddCategoryModal';
import CredentialsModal from './CredentialsModal';
import { SearchIcon, UserPlusIcon, PlusIcon, KebabIcon, ShieldIcon, CheckIcon } from '../icons/Icon';

export default function EmployeesList() {
  const { employees, employeeCategories, orders, customers, passwordResetRequests, getEmployee, approvePasswordReset } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(employeeCategories[0] || 'Salesperson');
  const [search, setSearch] = useState('');

  const category = employeeCategories.includes(activeCategory) ? activeCategory : (employeeCategories[0] || 'Salesperson');
  
  const q = search.toLowerCase().trim();
  const baseList = employees.filter((e) => e.role === category);
  const list = q
    ? baseList.filter((e) => e.name.toLowerCase().includes(q) || (e.designation && e.designation.toLowerCase().includes(q)) || (e.email && e.email.toLowerCase().includes(q)))
    : baseList;

  async function handleApproveReset(id) {
    let res;
    try {
      res = await approvePasswordReset(id);
    } catch (e) {
      toast(e.message);
      return;
    }
    if (res) openModal(<CredentialsModal title="Password reset approved" name={res.name} email={res.email} tempPw={res.tempPw} />, { variant: 'elegant', dismissible: false });
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Employees</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Employees</div>
          <div className="elg-page-sub">Grouped by role, with salary and payout schedule</div>
        </div>
      </div>

      {passwordResetRequests.length > 0 && (
        <div className="elg-panel" style={{ marginBottom: 20, padding: 20 }}>
          <div className="elg-card-head" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'var(--elg-primary)', display: 'flex', alignItems: 'center' }}>
              <ShieldIcon width={20} height={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--elg-ink)' }}>Password reset requests</div>
              <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>{passwordResetRequests.length} pending request{passwordResetRequests.length === 1 ? '' : 's'}</div>
            </div>
          </div>
          <div className="elg-table-wrap">
            <table className="elg-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Requested At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {passwordResetRequests.map((r) => {
                  const emp = getEmployee(r.employeeId);
                  return (
                    <tr key={r.id}>
                      <td><strong>{emp ? emp.name : '—'}</strong></td>
                      <td>{r.email}</td>
                      <td>{r.requestedAt}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="elg-btn elg-btn-primary elg-btn-sm"
                          style={{ width: 'auto', display: 'inline-flex' }}
                          onClick={() => handleApproveReset(r.id)}
                        >
                          <CheckIcon /> Approve Reset
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="elg-panel elg-filterbar" style={{ gap: 14 }}>
        <div className="elg-field-search" style={{ flex: 1 }}>
          <SearchIcon />
          <input
            placeholder="Search employees by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="elg-btn elg-btn-primary"
          style={{ width: 'auto', whiteSpace: 'nowrap' }}
          onClick={() => openModal(<EmployeeFormModal defaultCategory={category} />, { variant: 'elegant' })}
        >
          <UserPlusIcon /> Add Employee
        </button>
      </div>

      <div className="elg-tabs" style={{ marginBottom: 18 }}>
        {employeeCategories.map((cat) => {
          const count = employees.filter((e) => e.role === cat).length;
          return (
            <div
              key={cat}
              className={`elg-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({count})
            </div>
          );
        })}
        <div
          className="elg-tab"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => openModal(<AddCategoryModal onAdded={setActiveCategory} />, { variant: 'elegant' })}
        >
          <PlusIcon width={15} height={15} /> Add Team
        </div>
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Currency</th>
              <th>Base Salary</th>
              <th>Payout Day</th>
              <th>Unpaid Earnings</th>
              <th style={{ textAlign: 'right' }}>Options</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="elg-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No employees in {category} yet</div>
                  <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Add an employee and assign them to this team tab.</div>
                </td>
              </tr>
            )}
            {list.map((e) => {
              const unpaid = unpaidAmountFor(orders, customers, e);
              const unpaidStr = fmt(Object.values(unpaid).reduce((s, v) => s + v, 0), e.currency);
              return (
                <tr key={e.id}>
                  <td className="clickable" onClick={() => navigate(`/employees/${e.id}`)}>
                    <span>{e.name}</span>
                  </td>
                  <td>{e.designation || '—'}</td>
                  <td><span className="elg-pill">{e.currency}</span></td>
                  <td>{fmt(e.baseSalary, e.currency)}</td>
                  <td>The {e.payoutDay}th of each month</td>
                  <td><strong>{unpaidStr}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="elg-btn elg-btn-ghost elg-btn-sm"
                      style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openModal(<EmployeeSettingsMenuModal employeeId={e.id} />, { variant: 'elegant' });
                      }}
                      title="Options"
                    >
                      <KebabIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
