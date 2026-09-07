import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon, WarningIcon } from '../icons/Icon';

export default function ConfirmDeleteOrderModal({ order }) {
  const { softDeleteOrder } = useAppState();
  const { closeModal, toast } = useUi();

  function handleDelete() {
    closeModal();
    const { undo } = softDeleteOrder(order.id);
    toast(`"${order.name}" deleted.`, { action: { label: 'Undo', onClick: undo }, duration: 6000 });
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 440 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'var(--elg-delete-red)', display: 'flex', alignItems: 'center' }}>
            <WarningIcon width={20} height={20} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--elg-ink)' }}>Delete Order</div>
        </div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--elg-ink)', margin: 0, lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>"{order.name}"</strong>? You'll get a few seconds to undo this right after.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>
          Cancel
        </button>
        <button
          className="elg-btn"
          style={{ width: 'auto', background: 'var(--elg-delete-red)', borderColor: 'var(--elg-delete-red)', color: '#fff' }}
          onClick={handleDelete}
        >
          Delete Order
        </button>
      </div>
    </div>
  );
}
