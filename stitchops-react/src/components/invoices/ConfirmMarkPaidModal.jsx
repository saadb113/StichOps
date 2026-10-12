import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon, CheckIcon } from '../icons/Icon';

// Shared confirm-to-pay step for every screen that can toggle an invoice's
// payment status (Invoices list, Customer profile history, Reports). Only
// used when the click is about to mark an invoice Paid — reverting back to
// Pending stays a plain click, since that's a correction, not a billing
// event that needs a guard.
export default function ConfirmMarkPaidModal({ invoice, customerName }) {
  const { togglePaymentStatus } = useAppState();
  const { closeModal, toast } = useUi();

  async function handleConfirm() {
    try {
      await togglePaymentStatus(invoice.id);
      toast(`${invoice.invoiceNo} marked as Paid.`);
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal">
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--elg-ink)' }}>Mark Invoice as Paid</div>
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
          Mark invoice <strong>{invoice.invoiceNo}</strong>{customerName ? <> for <strong>{customerName}</strong></> : null} as <strong>Paid</strong>? This updates its payment status right away.
        </p>
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>
          Cancel
        </button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleConfirm}>
          Mark as Paid
        </button>
      </div>
    </div>
  );
}
