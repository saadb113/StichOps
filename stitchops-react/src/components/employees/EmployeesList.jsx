import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, unpaidAmountFor } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeSettingsMenuModal from './EmployeeSettingsMenuModal';
import AddCategoryModal from './AddCategoryModal';
import CredentialsModal from './CredentialsModal';
import { SearchIcon, UserPlusIcon, PlusIcon, KebabIcon, ShieldIcon, CheckIcon, CloseIcon, WarningIcon } from '../icons/Icon';

function ConfirmRejectPasswordResetModal({ requestId, name }) {
  const { rejectPasswordReset } = useAppState();
  const { closeModal, toast } = useUi();

  async function handleReject() {
    try {
      await rejectPasswordReset(requestId);
      closeModal();
      toast('Password reset request rejected.');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 560 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 300, color: 'var(--elg-ink)', fontFamily : "var(--elg-font-serif)" }}>Are you sure?</div>
        </div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{border : 0,outline : "none",background : "none", width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0, lineHeight: 1.5 }}>
          You're rejecting <strong>{name}'s</strong> password reset request. They will need to submit a new request if they still need a password reset.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>
          Cancel
        </button>
        <button
          className="elg-btn"
          style={{ width: 'auto', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }}
          onClick={handleReject}
        >
          Reject Request
        </button>
      </div>
    </div>
  );
}

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
    if (res) openModal(<CredentialsModal request={true} title="Password reset approved" name={res.name} email={res.email} tempPw={res.tempPw} />, { variant: 'elegant', dismissible: false });
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
            
            <div>
              <div style={{fontFamily : 'var(--elg-font-serif)', fontSize: 18, fontWeight: 300, color: 'var(--elg-ink)' }}>Password reset requests</div>
              
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
                      <td>{emp ? emp.name : '—'}</td>
                      <td>{r.email}</td>
                      <td>{r.requestedAt}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="elg-btn elg-btn-ghost elg-btn-sm elg-btn-danger-text"
                            style={{ width: 'auto', display: 'inline-flex' }}
                            onClick={() => openModal(<ConfirmRejectPasswordResetModal requestId={r.id} name={emp ? emp.name : 'This employee'} />, { variant: 'elegant' })}
                          >
                            Reject
                          </button>
                          <button
                            className="elg-btn elg-btn-primary elg-btn-sm"
                            style={{ width: 'auto', display: 'inline-flex' }}
                            onClick={() => handleApproveReset(r.id)}
                          >
                            <CheckIcon /> Approve Reset
                          </button>
                        </div>
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
              {category === 'Salesperson' && <th>Base Salary</th>}
              <th>Payout Day</th>
              <th>Unpaid Earnings</th>
              <th style={{ textAlign: 'right' }}>Options</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={category === 'Salesperson' ? 7 : 6} className="elg-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No employees in {category} yet</div>
                  <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Add an employee and assign them to this team tab.</div>
                </td>
              </tr>
            )}
            {list.map((e) => {
              const unpaid = unpaidAmountFor(orders, customers, e);
              const unpaidStr = fmt(Object.values(unpaid).reduce((s, v) => s + v, 0), e.currency);
              return (
                <tr className="clickable" key={e.id}>
                  <td  onClick={() => navigate(`/employees/${e.id}`)}>
                    <span>{e.name}</span>
                  </td>
                  <td>{e.designation || '—'}</td>
                  <td><span className="elg-currency">{e.currency}</span></td>
                  {category === 'Salesperson' && <td>{fmt(e.baseSalary, e.currency)}</td>}
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
