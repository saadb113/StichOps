import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function ConfirmDeleteEmployeeModal({ employeeId, name }) {
  const { deleteEmployee } = useAppState();
  const { closeModal, toast } = useUi();
  const navigate = useNavigate();

  async function handleDelete() {
    try {
      await deleteEmployee(employeeId);
      closeModal();
      toast('Employee deleted.');
      navigate('/employees');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal deleteEmployeeModal" style={{ maxWidth: 560 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--elg-ink)', fontFamily: 'var(--elg-font-serif)' }}>Are you sure?</div>
        </div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32, background: 'none', border: 0, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body">
        <p style={{ color: '#5C5C5C', margin: 0, lineHeight: 1.5 }}>
          You're deleting the employee <b style={{ fontWeight: 500, color: 'var(--elg-ink)' }}>"{name || 'this employee'}."</b> This action can't be undone. Their salary slip history will remain on record, but they'll no longer appear in the Employees list.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'max-content !important' }} onClick={closeModal}>
          Cancel
        </button>
        <button
          className="elg-btn"
          style={{ width: 'max-content !important', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }}
          onClick={handleDelete}
        >
          Delete Employee
        </button>
      </div>
    </div>
  );
}
