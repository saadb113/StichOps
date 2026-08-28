import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM, PHONE_CODES, splitContact } from '../../lib/constants';
import CredentialsModal from './CredentialsModal';
import { CloseIcon } from '../icons/Icon';
import AssignedEmailsField from './AssignedEmailsField';

export default function EmployeeFormModal({ employee = null, defaultCategory }) {
  const { employeeCategories, addEmployee, updateEmployee } = useAppState();
  const { closeModal, openModal, toast } = useUi();
  const e = employee;

  const initialContact = splitContact(e ? e.contact : '');

  const [name, setName] = useState(e ? e.name : '');
  const [role, setRole] = useState(e ? e.role : (defaultCategory || employeeCategories[0] || 'Salesperson'));
  const [designation, setDesignation] = useState(e ? (e.designation || '') : '');
  const [email, setEmail] = useState(e ? (e.email || '') : '');
  const [phoneCode, setPhoneCode] = useState(initialContact.code);
  const [phone, setPhone] = useState(initialContact.num);
  const [currency, setCurrency] = useState(e ? e.currency : 'GBP');
  const [salary, setSalary] = useState(e ? e.baseSalary : '');
  const [payoutDay, setPayoutDay] = useState(e ? e.payoutDay : 28);

  const [emails, setEmails] = useState(e && e.emails && e.emails.length ? e.emails : ['']);

  const showEmailPool = role === 'Salesperson';

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { toast('Name is required.'); return; }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const emailsList = showEmailPool ? emails.map((em) => em.trim()).filter(Boolean) : (e ? (e.emails || []) : []);
    const data = {
      name: trimmedName,
      role,
      designation: designation.trim(),
      email: trimmedEmail,
      contact: trimmedPhone ? `${phoneCode} ${trimmedPhone}` : '',
      emails: emailsList,
      currency,
      baseSalary: Number(salary) || 0,
      payoutDay: Number(payoutDay) || 28
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
          openModal(<CredentialsModal title="Login Created" name={credentials.name} email={credentials.email} tempPw={credentials.tempPw} />, { variant: 'elegant', dismissible: false });
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
    <div className="elg-modal employeesModal">
      {/* Modal Header */}
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>
      {!e ? 
      <div className="elg-modal-head-plain addemployee">
        <img src="/images/addEmployee.png" alt="" />
        <h3>Add Employee</h3>
        <p>Add employee details to add employee profile.</p>
      </div> :
      <div className="elg-modal-head-plain" style={{padding : 18, display: "block"}}>
        <h3 style={{fontSize : 20}}>Edit Employee</h3>
      </div>
      }

      {/* Modal Body */}
      <div className="elg-modal-body">
        {/* Row 1: Name & Team */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="elg-field">
            <label className="elg-label">Name</label>
            <input
              className="elg-input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="e.g. Carla Montero"
            />
          </div>
          <div className="elg-field">
            <label className="elg-label">Team</label>
            <select
              className="elg-select"
              value={role}
              onChange={(ev) => setRole(ev.target.value)}
            >
              {employeeCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Designation */}
        <div className="elg-field">
          <label className="elg-label">Designation</label>
          <input
            className="elg-input"
            value={designation}
            onChange={(ev) => setDesignation(ev.target.value)}
            placeholder="e.g. Team Lead, Senior"
          />
        </div>

        {/* Row 3: Employee Email & Contact Number */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
          <div className="elg-field">
            <label className="elg-label">Employee Email</label>
            <input
              className="elg-input"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="e.g. carla@abcdigitizing.com"
            />
          </div>
          <div className="elg-field">
            <label className="elg-label">Contact Number</label>
            <div className='elg-price-field' style={{ display: 'flex', gap: 8 }}>
              <select
                className="elg-select"
                
                value={phoneCode}
                onChange={(ev) => setPhoneCode(ev.target.value)}
              >
                {PHONE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="elg-input"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                placeholder="000 000000"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Base Salary (with Currency select) & Payout Day */}
        <div className="elg-field">
          <label className="elg-label">Base Salary</label>
          <div className='elg-price-field' style={{ display: 'flex', gap: 8 }}>
            <input
              className="elg-input"
              type="number"
              step="0.01"
              value={salary}
              onChange={(ev) => setSalary(ev.target.value)}
              placeholder="0.00"
            />
            <select
              style={{outline : "none" }}
              value={currency}
              onChange={(ev) => setCurrency(ev.target.value)}
            >
              {Object.keys(SYM).map((cc) => (
                <option key={cc} value={cc}>{cc}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="elg-field">
          <label className="elg-label">Payout Day</label>
          <input
            className="elg-input"
            type="number"
            min="1"
            max="28"
            value={payoutDay}
            onChange={(ev) => setPayoutDay(ev.target.value)}
            placeholder="5"
          />
        </div>

        {/* Row 5: Assigned Client-Facing Emails (If Salesperson) */}
        {showEmailPool && (
          <div className="elg-field assignedEmails">
            <label className="elg-label">Assigned Client-Facing Emails</label>
            <AssignedEmailsField employeeId={e ? e.id : null} value={emails} onChange={setEmails} />
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>
          Cancel
        </button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>
          {e ? 'Save Changes' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
}
