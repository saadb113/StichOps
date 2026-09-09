import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function ConfirmDeleteTeamModal({ name, onDeleted }) {
  const { deleteCategory } = useAppState();
  const { closeModal, toast } = useUi();

  async function handleDelete() {
    try {
      await deleteCategory(name);
      closeModal();
      toast(`"${name}" team removed.`);
      if (onDeleted) onDeleted();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 480 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>Are you sure?</div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0, lineHeight: 1.6 }}>
          You're deleting the <strong>"{name}"</strong> team. This action can't be undone. Employees in this team will be removed from the Employees list, their profiles will be deleted, and they won't be able to access their accounts.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button
          className="elg-btn"
          style={{ width: 'auto', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }}
          onClick={handleDelete}
        >
          Delete Team
        </button>
      </div>
    </div>
  );
}
