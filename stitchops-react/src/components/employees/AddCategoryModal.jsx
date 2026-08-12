import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon, PlusIcon } from '../icons/Icon';

const addTabImg = '/images/addTeam.svg';

export default function AddCategoryModal({ onAdded }) {
  const { employeeCategories, addCategory } = useAppState();
  const { closeModal, toast } = useUi();
  const [name, setName] = useState('');

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) { toast('Tab name is required.'); return; }
    if (employeeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) { toast('A tab with that name already exists.'); return; }
    try {
      await addCategory(trimmed);
      closeModal();
      toast('Team tab added.');
      if (onAdded) onAdded(trimmed);
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal add-team" >
      
      <div className="elg-modal-hero">
        <div className="elg-modal-hero-icon"><img src={addTabImg} alt="" /></div>
        <div className="elg-modal-title">Add Team</div>
        <div className="elg-modal-sub">Add team to add new employee profiles.</div>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <div className="elg-field">
          <label className="elg-label">Team Name</label>
          <input
            className="elg-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Accountants"
            autoFocus
          />
        </div>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>
          Cancel
        </button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto', display: 'inline-flex' }} onClick={handleAdd}>
          <PlusIcon /> Add Team
        </button>
      </div>
    </div>
  );
}
