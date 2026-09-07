import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon, PlusIcon } from '../icons/Icon';

// Salesperson and Designer drive dedicated commission/production-cost logic
// elsewhere (OrderFormModal, EarningsTab, payslips) — kept read-only here,
// matching the backend's protection in routes/employeeCategories.js.
const PROTECTED = ['Salesperson', 'Designer'];

export default function EditTeamsModal() {
  const { employeeCategories, addCategory, renameCategory, deleteCategory } = useAppState();
  const { closeModal, toast } = useUi();
  const [rows, setRows] = useState(employeeCategories.map((name) => ({ key: name, original: name, value: name, isNew: false })));
  const [saving, setSaving] = useState(false);

  function updateRow(key, value) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value } : r)));
  }

  function addRow() {
    const key = `new-${Date.now()}`;
    setRows((rs) => [...rs, { key, original: null, value: '', isNew: true }]);
  }

  async function removeRow(row) {
    if (row.isNew) {
      setRows((rs) => rs.filter((r) => r.key !== row.key));
      return;
    }
    try {
      await deleteCategory(row.original);
      setRows((rs) => rs.filter((r) => r.key !== row.key));
      toast(`"${row.original}" removed.`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const row of rows) {
        const trimmed = row.value.trim();
        if (row.isNew) {
          if (trimmed) await addCategory(trimmed);
        } else if (trimmed && trimmed !== row.original) {
          await renameCategory(row.original, trimmed);
        }
      }
      toast('Teams updated.');
      closeModal();
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 420 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>Edit Teams</div>
        <button className="elg-btn elg-btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <label className="elg-label" style={{ marginBottom: 10, display: 'block' }}>Teams</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => {
            const protectedRow = !row.isNew && PROTECTED.includes(row.original);
            return (
              <div key={row.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="elg-input"
                  style={{ flex: 1 }}
                  value={row.value}
                  disabled={protectedRow}
                  placeholder={row.isNew ? 'e.g. Accountants' : ''}
                  onChange={(e) => updateRow(row.key, e.target.value)}
                  autoFocus={row.isNew}
                />
                {!protectedRow && (
                  <button
                    type="button"
                    className="elg-icon-sq"
                    style={{ color: 'var(--elg-red-ink)', flexShrink: 0 }}
                    onClick={() => removeRow(row)}
                    title="Remove team"
                  >
                    <img src="/images/cancel-x-mark.svg" alt="" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="elg-btn elg-btn-ghost"
          style={{ fontWeight: 400, width: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', gap: 4, marginTop: 12 }}
          onClick={addRow}
        >
          <PlusIcon width={15} height={15} /> Add Team
        </button>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>Save Changes</button>
      </div>
    </div>
  );
}
