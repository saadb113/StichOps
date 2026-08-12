import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function AddEmailModal() {
  const { employees, addCompanyEmail } = useAppState();
  const { closeModal, toast } = useUi();

  const [email, setEmail] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  async function handleAdd() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { toast('Enter a valid email.'); return; }
    const res = await addCompanyEmail(trimmed, assignedTo ? Number(assignedTo) : null);
    if (!res.ok) { toast(res.error); return; }
    toast('Email added.');
    closeModal();
  }

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><CloseIcon /></button>
      <div className="elg-modal-hero">
        <div className="elg-modal-hero-icon"><img src="/images/addEmail.svg" alt="" /></div>
        <div className="elg-modal-title">Add Email</div>
        <div className="elg-modal-sub">Add new email and assigned to employee.</div>
      </div>

      <div className="elg-modal-body">
        <div className="elg-field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. you@company.com" />
        </div>
        <div className="elg-field">
          <label>Assigned to</label>
          <select className="elg-select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">e.g. Shaheer Baig</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
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
