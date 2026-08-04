import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import OrderFormModal from '../orders/OrderFormModal';
import { CloseIcon, PencilIcon } from '../icons/Icon';

export default function EditInvoiceOrdersModal({ invoiceId }) {
  const { invoices, orders, getCustomer } = useAppState();
  const { closeModal, openModal } = useUi();

  const inv = invoices.find((i) => i.id === invoiceId);
  const c = inv ? getCustomer(inv.customerId) : null;
  const invOrders = inv ? orders.filter((o) => inv.orderIds.includes(o.id)) : [];

  if (!inv) return null;

  return (
    <>
      <button className="elg-modal-close" onClick={closeModal}><CloseIcon /></button>
      <div className="elg-modal-head-plain">
        <h3>Edit {inv.invoiceNo} — {c ? c.company : ''}</h3>
      </div>
      <div className="elg-modal-body">
        <p style={{ fontSize: '13px', color: 'var(--elg-ink-2)', marginBottom: 16, lineHeight: 1.5 }}>
          Edit this order. Changes will be saved immediately and reflected in the customer's invoice, the Orders list and the employee's earnings.
        </p>
        <table className="elg-table">
          <thead><tr><th>Customer</th><th>Price</th><th>Action</th></tr></thead>
          <tbody>
            {invOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{o.price.toFixed(2)}</td>
                <td>
                  <button className="elg-icon-sq" title="Edit order" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}>
                    <PencilIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="elg-modal-foot plain">
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
      </div>
    </>
  );
}
