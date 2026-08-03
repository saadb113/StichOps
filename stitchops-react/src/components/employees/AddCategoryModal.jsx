import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';

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
      toast('Tab added.');
      if (onAdded) onAdded(trimmed);
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <div className="modal-head"><h3>Add employee tab</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body"><div className="field"><label>Tab name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production supervisor" /></div></div>
      <div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add tab</button></div>
    </>
  );
}
