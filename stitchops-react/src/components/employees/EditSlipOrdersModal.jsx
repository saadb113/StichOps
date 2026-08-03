import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersForEmployee, commissionAmt } from '../../lib/helpers';

export default function EditSlipOrdersModal({ ctx }) {
  const { orders, customers, payslips, getEmployee, getCustomer, updateOrder } = useAppState();
  const { closeModal, toast } = useUi();
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editRateOrCost, setEditRateOrCost] = useState('');

  let e; let rows; let showCustomer; let title; let bodyText;
  if (ctx.type === 'earnings') {
    e = getEmployee(ctx.employeeId);
    rows = ordersForEmployee(orders, customers, e).filter((o) => o.status === 'Completed' && o.customerId === ctx.customerId);
    showCustomer = false;
    const cust = getCustomer(ctx.customerId);
    title = `${cust ? cust.company : ''} — orders`;
    bodyText = 'Edit price or rate directly below. Changes save immediately and also update this payslip and the Reports commission summary.';
  } else {
    const s = payslips.find((x) => x.id === ctx.slipId);
    e = getEmployee(s.employeeId);
    rows = orders.filter((o) => s.orderIds.includes(o.id));
    showCustomer = true;
    title = `Edit ${s.slipNo} — ${e.name}`;
    bodyText = "Edit price or rate directly below. Changes save immediately and also show on the Reports commission summary and this employee's Earnings tab. The slip total shown in history reflects the original approved amount.";
  }
  const isSales = e.role === 'Salesperson';

  function startEdit(o) {
    setEditingId(o.id);
    setEditPrice(o.price);
    setEditRateOrCost(isSales ? o.commissionRate : o.productionCost);
  }
  function cancelEdit() { setEditingId(null); }
  async function saveEdit(o) {
    const price = Number(editPrice);
    if (!price) { toast('Price is required.'); return; }
    const data = { price };
    if (isSales) data.commissionRate = Number(editRateOrCost) || 0;
    else data.productionCost = Number(editRateOrCost) || 0;
    try {
      await updateOrder(o.id, data);
      setEditingId(null);
      toast('Order updated — reflected in Reports and the Earnings tab.');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <div className="modal-head"><h3>{title}</h3><button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button></div>
      <div className="modal-body">
        <p style={{ fontSize: '12.5px', color: 'var(--ink-2)', marginBottom: 12 }}>{bodyText}</p>
        <table>
          <thead><tr><th>Order</th>{showCustomer && <th>Customer</th>}<th>{isSales ? 'Commission' : 'Production'}</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={showCustomer ? 4 : 3} className="empty">No linked orders.</td></tr>}
            {rows.map((o) => (editingId === o.id ? (
              <tr key={o.id}>
                <td>{o.name}</td>
                {showCustomer && <td>{getCustomer(o.customerId).company}</td>}
                <td>
                  <input type="number" step="0.01" value={editPrice} onChange={(ev) => setEditPrice(ev.target.value)} style={{ width: 80, padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)' }} />
                  {isSales ? (
                    <> <input type="number" value={editRateOrCost} onChange={(ev) => setEditRateOrCost(ev.target.value)} style={{ width: 70, padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)' }} /> %</>
                  ) : (
                    <input type="number" step="0.01" value={editRateOrCost} onChange={(ev) => setEditRateOrCost(ev.target.value)} style={{ width: 90, padding: '5px 7px', border: '1px solid var(--accent)', borderRadius: 5, fontSize: '12.5px', fontFamily: 'var(--font)' }} />
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => saveEdit(o)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={o.id}>
                <td>{o.name}</td>
                {showCustomer && <td>{getCustomer(o.customerId).company}</td>}
                <td>{fmt(isSales ? commissionAmt(o) : o.productionCost, o.currency)}</td>
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
