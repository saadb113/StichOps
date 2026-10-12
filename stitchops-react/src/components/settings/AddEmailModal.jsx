import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function AddEmailModal() {
  const { employees, addCompanyEmail } = useAppState();
  const { closeModal, toast } = useUi();

  const [email, setEmail] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);

  function toggleEmployee(id) {
    setAssignedTo((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleAdd() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { toast('Enter a valid email.'); return; }
    const res = await addCompanyEmail(trimmed, assignedTo);
    if (!res.ok) { toast(res.error); return; }
    toast('Email added.');
    closeModal();
  }

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>
      <div className="elg-modal-hero">
        <div className="elg-modal-hero-icon"><img src="/images/addEmail.svg" alt="" /></div>
        <div className="elg-modal-title">Add Email</div>
        <div className="elg-modal-sub">Add new email and assigned to employee.</div>
      </div>

      <div className="elg-modal-body addemail">
        <div className="elg-field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. you@company.com" />
        </div>
        <div className="elg-field">
          <label>Assigned to</label>
          <div style={{ border: '1px solid var(--elg-line)', borderRadius: 8, maxHeight: 180, overflowY: 'auto', padding: '6px 10px' }}>
            {employees.length === 0 && <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', padding: '6px 0' }}>No employees yet.</div>}
            {employees.map((e) => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={assignedTo.includes(e.id)} onChange={() => toggleEmployee(e.id)} />
                {e.name}
              </label>
            ))}
          </div>
          <div className="hint" style={{ fontSize: 11.5, color: 'var(--elg-ink-3)', marginTop: 4 }}>Select one or more employees — the same email can be shared.</div>
        </div>
      </div>

      <div className="elg-modal-foot">
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleAdd}>Add Email</button>
      </div>
    </>
  );
}
