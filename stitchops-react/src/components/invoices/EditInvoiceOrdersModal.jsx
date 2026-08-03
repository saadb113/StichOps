import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt } from '../../lib/helpers';

export default function EditInvoiceOrdersModal({ invoiceId }) {
  const { invoices, orders, getCustomer, updateOrder } = useAppState();
  const { closeModal, toast } = useUi();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const inv = invoices.find((i) => i.id === invoiceId);
  const c = inv ? getCustomer(inv.customerId) : null;
  const invOrders = inv ? orders.filter((o) => inv.orderIds.includes(o.id)) : [];

  function startEdit(o) {
    setEditingId(o.id);
    setEditName(o.name);
    setEditPrice(o.price);
  }
  function cancelEdit() { setEditingId(null); }
  async function saveEdit(o) {
    const name = editName.trim();
    const price = Number(editPrice);
    if (!name || !price) { toast('Order name and price are required.'); return; }
    try {
      await updateOrder(o.id, { name, price });
      setEditingId(null);
      toast('Order updated — reflected on the Orders screen too.');
    } catch (e) {
      toast(e.message);
    }
  }

  if (!inv) return null;

  return (
    <>
      <div className="modal-head"><h3>Edit {inv.invoiceNo} — {c ? c.company : ''}</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body">
        <p style={{ fontSize: '12.5px', color: 'var(--ink-2)', marginBottom: 12 }}>Edit the name or price directly below. Changes save immediately and also show on the Orders screen.</p>
        <table>
          <thead><tr><th>Order</th><th style={{ textAlign: 'right' }}>Price</th><th></th></tr></thead>
          <tbody>
            {invOrders.map((o) => (editingId === o.id ? (
              <tr key={o.id}>
                <td><input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)' }} /></td>
                <td style={{ textAlign: 'right' }}><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: 90, padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)', textAlign: 'right' }} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => saveEdit(o)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={o.id}>
                <td>{o.name}</td><td style={{ textAlign: 'right' }}>{fmt(o.price, o.currency)}</td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => startEdit(o)} title="Edit">&#9998;</button></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button></div>
    </>
  );
}
