import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM } from '../../lib/constants';
import CredentialsModal from './CredentialsModal';

export default function EmployeeFormModal({ employee = null, defaultCategory }) {
  const { employeeCategories, companyEmails, employees, addEmployee, updateEmployee } = useAppState();
  const { closeModal, openModal, toast } = useUi();
  const e = employee;

  const [name, setName] = useState(e ? e.name : '');
  const [role, setRole] = useState(e ? e.role : (defaultCategory || employeeCategories[0]));
  const [designation, setDesignation] = useState(e ? (e.designation || '') : '');
  const [email, setEmail] = useState(e ? (e.email || '') : '');
  const [currency, setCurrency] = useState(e ? e.currency : 'GBP');
  const [salary, setSalary] = useState(e ? e.baseSalary : '');
  const [payoutDay, setPayoutDay] = useState(e ? e.payoutDay : 28);
  const [checkedEmails, setCheckedEmails] = useState(new Set(e && e.emails ? e.emails : []));

  const showEmailPool = !e || role === 'Salesperson';

  function toggleEmail(em) {
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(em)) next.delete(em); else next.add(em);
      return next;
    });
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { toast('Name is required.'); return; }
    const trimmedEmail = email.trim().toLowerCase();
    const emailsList = showEmailPool ? Array.from(checkedEmails) : (e ? (e.emails || []) : []);
    const data = {
      name: trimmedName, role, designation: designation.trim(), email: trimmedEmail, emails: emailsList,
      currency, baseSalary: Number(salary) || 0, payoutDay: Number(payoutDay) || 28
    };
    try {
      if (e) {
        await updateEmployee(e.id, data);
        toast('Employee updated.');
        closeModal();
      } else {
        const { credentials, needsEmailWarning } = await addEmployee(data);
        if (needsEmailWarning) toast('Email is required to create a salesperson login.');
        if (credentials) {
          openModal(<CredentialsModal title="Login created" name={credentials.name} email={credentials.email} tempPw={credentials.tempPw} />, { dismissible: false });
          return;
        }
        toast('Employee added.');
        closeModal();
      }
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <div className="modal-head"><h3>{e ? 'Edit employee' : 'Add employee'}</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body">
        <div className="field-row">
          <div className="field"><label>Name</label><input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Full name" /></div>
          <div className="field">
            <label>Tab / role</label>
            <select value={role} onChange={(ev) => setRole(ev.target.value)}>
              {employeeCategories.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
            <div className="hint">Determines which tab they appear under and whether commission or production earnings apply.</div>
          </div>
        </div>
        <div className="field"><label>Designation</label><input value={designation} onChange={(ev) => setDesignation(ev.target.value)} placeholder="e.g. Senior Digitizer, Account Executive" /></div>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="name@stitchops.com" />
          <div className="hint">{e && e.role === 'Salesperson' ? 'Used for their login — changing it updates their sign-in email.' : 'Required if this role should be able to log in.'}</div>
        </div>
        <div className="field-row">
          <div className="field"><label>Currency</label><select value={currency} onChange={(ev) => setCurrency(ev.target.value)}>{Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}</select></div>
          <div className="field"><label>Base salary</label><input type="number" step="0.01" value={salary} onChange={(ev) => setSalary(ev.target.value)} placeholder="0.00" /></div>
        </div>
        <div className="field">
          <label>Payout day</label>
          <input type="number" min="1" max="28" value={payoutDay} onChange={(ev) => setPayoutDay(ev.target.value)} />
          <div className="hint">Salary slip auto-generates each month on this day, covering base salary plus unpaid commission or production earnings.</div>
        </div>
        {showEmailPool && (
          <div className="field">
            <label>Assigned client-facing emails</label>
            <div className="hint" style={{ marginTop: 0, marginBottom: 8 }}>Companies often route leads through several inboxes to one salesperson. Select every email this person receives clients on from the pool managed in Company Settings — they'll pick the right one when adding a new customer.</div>
            <div style={{ border: '1px solid var(--line-strong)', borderRadius: 8, padding: '10px 12px', maxHeight: 160, overflow: 'auto' }}>
              {companyEmails.length ? companyEmails.map((em) => {
                const takenBy = employees.find((x) => x.id !== (e ? e.id : -1) && x.emails && x.emails.includes(em));
                const checked = checkedEmails.has(em);
                return (
                  <label key={em} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, opacity: takenBy ? 0.5 : 1 }}>
                    <input type="checkbox" checked={checked} disabled={!!takenBy} onChange={() => toggleEmail(em)} style={{ width: 'auto' }} />
                    {em} {takenBy && <span style={{ color: 'var(--ink-3)', fontSize: '11.5px' }}>(assigned to {takenBy.name})</span>}
                  </label>
                );
              }) : <div className="hint" style={{ margin: 0 }}>No emails in the pool yet — add some in Company Settings first.</div>}
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>{e ? 'Save changes' : 'Add employee'}</button>
      </div>
    </>
  );
}
