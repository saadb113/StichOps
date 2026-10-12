import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function EditEmailModal({ email, employeeIds = [] }) {
  const { employees, updateCompanyEmail, removeCompanyEmail } = useAppState();
  const { closeModal, toast } = useUi();

  const [newEmail, setNewEmail] = useState(email);
  const [assignedTo, setAssignedTo] = useState(employeeIds);

  function toggleEmployee(id) {
    setAssignedTo((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSave() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { toast('Enter a valid email.'); return; }
    const res = await updateCompanyEmail(email, {
      email: trimmed,
      employeeIds: assignedTo
    });
    if (!res.ok) { toast(res.error); return; }
    toast('Email updated.');
    closeModal();
  }

  async function handleDelete() {
    const res = await removeCompanyEmail(email);
    if (!res.ok) { toast(res.error); return; }
    toast('Email removed.');
    closeModal();
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 560 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>Edit Email</div>
        <button className="elg-btn elg-btn-ghost" style={{border : 0, background : "none", width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body editemail" style={{ padding: "30px 24px" }}>
        <div className="elg-field">
          <label>Email</label>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. you@company.com" />
        </div>
        <div className="elg-field" style={{ marginBottom: 0 }}>
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

      <div className="elg-modal-foot buttons3" style={{ borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'max-content', color: 'var(--elg-delete-red)' }} onClick={handleDelete}>Delete Email</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
