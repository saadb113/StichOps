import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM } from '../../lib/constants';
import CredentialsModal from './CredentialsModal';
import { CloseIcon, UserPlusIcon, PlusIcon, TrashIcon } from '../icons/Icon';

export default function EmployeeFormModal({ employee = null, defaultCategory }) {
  const { employeeCategories, companyEmails, employees, addEmployee, updateEmployee } = useAppState();
  const { closeModal, openModal, toast } = useUi();
  const e = employee;

  const [name, setName] = useState(e ? e.name : '');
  const [role, setRole] = useState(e ? e.role : (defaultCategory || employeeCategories[0] || 'Salesperson'));
  const [designation, setDesignation] = useState(e ? (e.designation || '') : '');
  const [email, setEmail] = useState(e ? (e.email || '') : '');
  const [phoneCode, setPhoneCode] = useState(e?.phoneCode || '+92');
  const [phone, setPhone] = useState(e?.phone || '');
  const [currency, setCurrency] = useState(e ? e.currency : 'GBP');
  const [salary, setSalary] = useState(e ? e.baseSalary : '');
  const [payoutDay, setPayoutDay] = useState(e ? e.payoutDay : 28);

  const [checkedEmails, setCheckedEmails] = useState(new Set(e && e.emails ? e.emails : []));
  const [customEmail, setCustomEmail] = useState('');

  const showEmailPool = role === 'Salesperson';

  function toggleEmail(em) {
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(em)) next.delete(em); else next.add(em);
      return next;
    });
  }

  function handleAddCustomEmail() {
    const trimmed = customEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@')) { toast('Please enter a valid email.'); return; }
    setCheckedEmails((prev) => new Set(prev).add(trimmed));
    setCustomEmail('');
  }

  function handleRemoveEmail(em) {
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      next.delete(em);
      return next;
    });
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) { toast('Name is required.'); return; }
    const trimmedEmail = email.trim().toLowerCase();
    const emailsList = showEmailPool ? Array.from(checkedEmails) : (e ? (e.emails || []) : []);
    const data = {
      name: trimmedName,
      role,
      designation: designation.trim(),
      email: trimmedEmail,
      phoneCode,
      phone: phone.trim(),
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
    <div className="elg-modal" style={{ maxWidth: 580 }}>
      {/* Modal Header */}
      <button className="elg-modal-close" onClick={closeModal}><CloseIcon /></button>
      <div className="elg-modal-head-plain">
        <h3>{e ? 'Edit Profile' : 'Add Employee'}</h3>
      </div>

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
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="elg-select"
                style={{ width: 85, flexShrink: 0 }}
                value={phoneCode}
                onChange={(ev) => setPhoneCode(ev.target.value)}
              >
                <option value="+92">+92</option>
                <option value="+44">+44</option>
                <option value="+1">+1</option>
                <option value="+971">+971</option>
                <option value="+61">+61</option>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="elg-input"
              type="number"
              step="0.01"
              value={salary}
              onChange={(ev) => setSalary(ev.target.value)}
              placeholder="0.00"
            />
            <select
              className="elg-select"
              style={{ width: 90, flexShrink: 0 }}
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
          <div className="elg-field">
            <label className="elg-label">Assigned Client-Facing Emails</label>

            {/* List of checked emails */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {Array.from(checkedEmails).map((em) => (
                <div
                  key={em}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--elg-page-bg)',
                    border: '1px solid var(--elg-line)',
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--elg-ink)' }}>{em}</span>
                  <button
                    className="elg-btn elg-btn-ghost elg-btn-sm"
                    style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--elg-red-ink)' }}
                    onClick={() => handleRemoveEmail(em)}
                    title="Remove Email"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              ))}

              {/* Company email options available to check */}
              {companyEmails.map((em) => {
                if (checkedEmails.has(em)) return null;
                const takenBy = employees.find((x) => x.id !== (e ? e.id : -1) && x.emails && x.emails.includes(em));
                return (
                  <label
                    key={em}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      fontSize: 13,
                      opacity: takenBy ? 0.5 : 1,
                      cursor: takenBy ? 'default' : 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={!!takenBy}
                      onChange={() => toggleEmail(em)}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontFamily: 'monospace' }}>{em}</span>
                    {takenBy && <span style={{ color: 'var(--elg-ink-3)', fontSize: 11.5 }}>(assigned to {takenBy.name})</span>}
                  </label>
                );
              })}
            </div>

            {/* Custom Add Email Input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="elg-input"
                value={customEmail}
                onChange={(ev) => setCustomEmail(ev.target.value)}
                placeholder="name@theelegantsdesign.com"
                onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); handleAddCustomEmail(); } }}
              />
              <button
                type="button"
                className="elg-btn elg-btn-ghost"
                style={{ width: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', gap: 4 }}
                onClick={handleAddCustomEmail}
              >
                <PlusIcon width={15} height={15} /> Add Email
              </button>
            </div>
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
