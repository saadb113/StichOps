import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, unpaidAmountFor } from '../../lib/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeSettingsMenuModal from './EmployeeSettingsMenuModal';
import AddCategoryModal from './AddCategoryModal';
import CredentialsModal from './CredentialsModal';

export default function EmployeesList() {
  const { employees, employeeCategories, orders, customers, passwordResetRequests, getEmployee, approvePasswordReset } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(employeeCategories[0]);

  const category = employeeCategories.includes(activeCategory) ? activeCategory : employeeCategories[0];
  const list = employees.filter((e) => e.role === category);

  async function handleApproveReset(id) {
    let res;
    try {
      res = await approvePasswordReset(id);
    } catch (e) {
      toast(e.message);
      return;
    }
    if (res) openModal(<CredentialsModal title="Password reset approved" name={res.name} email={res.email} tempPw={res.tempPw} />, { dismissible: false });
  }

  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Employees</div><div className="page-sub">Grouped by role, with salary and payout schedule</div></div>
        <button className="btn btn-primary" onClick={() => openModal(<EmployeeFormModal defaultCategory={category} />)}>+ Add employee</button>
      </div>
      {passwordResetRequests.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Password reset requests</h3></div>
          <table>
            <thead><tr><th>Employee</th><th>Email</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {passwordResetRequests.map((r) => {
                const emp = getEmployee(r.employeeId);
                return (
                  <tr key={r.id}>
                    <td>{emp ? emp.name : '—'}</td>
                    <td>{r.email}</td>
                    <td>{r.requestedAt}</td>
                    <td><button className="btn btn-sm btn-primary" onClick={() => handleApproveReset(r.id)}>Approve</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="tabs" style={{ alignItems: 'center' }}>
        {employeeCategories.map((cat) => (
          <div key={cat} className={`tab ${category === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat} ({employees.filter((e) => e.role === cat).length})</div>
        ))}
        <div className="tab" style={{ color: 'var(--accent)' }} onClick={() => openModal(<AddCategoryModal onAdded={setActiveCategory} />)}>+ Add tab</div>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Name</th><th>Designation</th><th>Currency</th><th>Base salary</th><th>Payout day</th><th>Unpaid earnings</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="empty"><i>No one in {category} yet</i>Add an employee and assign this tab.</td></tr>}
            {list.map((e) => {
              const unpaid = unpaidAmountFor(orders, customers, e);
              const unpaidStr = fmt(Object.values(unpaid).reduce((s, v) => s + v, 0), e.currency);
              return (
                <tr key={e.id}>
                  <td className="clickable" onClick={() => navigate(`/employees/${e.id}`)}><strong>{e.name}</strong></td>
                  <td>{e.designation || '—'}</td>
                  <td>{e.currency}</td>
                  <td>{fmt(e.baseSalary, e.currency)}</td>
                  <td>{e.payoutDay} of each month</td>
                  <td>{unpaidStr}</td>
                  <td><button className="btn btn-sm btn-ghost" onClick={(ev) => { ev.stopPropagation(); openModal(<EmployeeSettingsMenuModal employeeId={e.id} />); }} title="Options">&#8942;</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
