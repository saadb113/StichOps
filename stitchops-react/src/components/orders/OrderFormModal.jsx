import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM, ORDER_STATUSES, TODAY } from '../../lib/constants';
import { customerOverdueInvoices, paymentBadge } from '../../lib/helpers';

export default function OrderFormModal({ customerId = null, order = null, allowCompanyPicker = false }) {
  const { customers, employees, getCustomer, invoices, addOrder, updateOrder, deleteOrder } = useAppState();
  const { closeModal, toast } = useUi();

  const designers = employees.filter((e) => e.role === 'Designer');

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const cust = selectedCustomerId ? getCustomer(Number(selectedCustomerId)) : null;

  const [name, setName] = useState(order ? order.name : '');
  const [date, setDate] = useState(order ? order.date : TODAY);
  const [price, setPrice] = useState(order ? order.price : '');
  const [currency, setCurrency] = useState(order ? order.currency : (cust ? cust.currency : ''));
  const [designer, setDesigner] = useState(order ? order.designer : (designers[0]?.name || ''));
  const [cost, setCost] = useState(order ? order.productionCost : '');
  const [commission, setCommission] = useState(order ? order.commissionRate : 10);
  const [status, setStatus] = useState(order ? order.status : 'Completed');

  const showPicker = allowCompanyPicker && !order;

  function handleCompanyChange(id) {
    setSelectedCustomerId(id);
    const c = getCustomer(Number(id));
    if (c) setCurrency(c.currency);
  }

  const overdue = cust ? customerOverdueInvoices(invoices, cust.id) : [];

  async function handleSave() {
    if (!selectedCustomerId) { toast('Select a company first.'); return; }
    const trimmedName = name.trim();
    const priceNum = Number(price);
    if (!trimmedName || !priceNum) { toast('Order name and price are required.'); return; }
    const data = {
      customerId: Number(selectedCustomerId), name: trimmedName, date: date || TODAY,
      price: priceNum, currency, designer, productionCost: Number(cost) || 0,
      commissionRate: Number(commission) || 10, status
    };
    try {
      if (order) {
        const { wasInvoiced } = await updateOrder(order.id, data);
        toast(wasInvoiced ? 'Order updated. Approved invoices are unaffected — use Regenerate if this order needs to be re-billed.' : 'Order updated.');
      } else {
        const { customer, statusChangedTo } = await addOrder(data);
        if (statusChangedTo) toast(`Order added. ${customer.company} status updated to Paid.`);
        else toast(allowCompanyPicker ? `Order added for ${customer.company}.` : 'Order added.');
      }
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteOrder(order.id);
      toast('Order deleted.');
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <div className="modal-head">
        <h3>{order ? 'Edit order' : 'Add order'}{cust && !allowCompanyPicker ? ` — ${cust.company}` : ''}</h3>
        <button className="btn btn-ghost btn-sm" onClick={closeModal}>Close</button>
      </div>
      <div className="modal-body">
        {showPicker && (
          <div className="field">
            <label>Company name</label>
            <select value={selectedCustomerId} onChange={(e) => handleCompanyChange(e.target.value)}>
              <option value="">— Select a customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
            <div className="hint">Everything else pulls from that customer's profile automatically — no need to re-type it.</div>
          </div>
        )}

        {cust && (
          <>
            {overdue.length > 0 && (
              <div className="flag" style={{ background: 'var(--red-soft)', color: 'var(--red-ink)', borderColor: '#E3AFA9' }}>
                <span>&#9888;</span>
                <div>
                  {cust.company} hasn't paid {overdue.length > 1 ? 'invoices' : 'invoice'}{' '}
                  {overdue.map((i, idx) => (
                    <span key={i.id}>
                      <strong>{i.invoiceNo}</strong>{!allowCompanyPicker ? ` (${paymentBadge(i).label.replace('Unpaid — ', '')} overdue)` : ''}{idx < overdue.length - 1 ? ', ' : ''}
                    </span>
                  ))}.
                  {!allowCompanyPicker ? ' Consider resolving payment before adding new work.' : ''}
                </div>
              </div>
            )}

            {allowCompanyPicker && (
              <div className="panel" style={{ marginBottom: 14 }}>
                <div style={{ padding: '12px 16px' }}>
                  <div className="kv">
                    <div className="kv-row"><span className="k">Contact</span><span className="v">{cust.name}</span></div>
                    <div className="kv-row"><span className="k">Phone</span><span className="v">{cust.contact}</span></div>
                    <div className="kv-row"><span className="k">Email</span><span className="v">{cust.email}</span></div>
                    <div className="kv-row"><span className="k">Country</span><span className="v">{cust.country}</span></div>
                    <div className="kv-row"><span className="k">Default currency</span><span className="v">{cust.currency}</span></div>
                    <div className="kv-row"><span className="k">Salesperson</span><span className="v">{cust.salesperson}</span></div>
                  </div>
                </div>
              </div>
            )}

            <div className="field-row">
              <div className="field"><label>Order name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Autumn Polo Batch" /></div>
              <div className="field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Price</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></div>
              <div className="field">
                <label>Currency {!allowCompanyPicker && <span className="hint" style={{ display: 'inline' }}>(defaults to {cust.currency})</span>}</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Designer</label><select value={designer} onChange={(e) => setDesigner(e.target.value)}>{designers.map((d) => <option key={d.id}>{d.name}</option>)}</select></div>
              <div className="field"><label>Production cost</label><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Commission rate (%)</label>
                <input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
                <div className="commission-note">Default is 10% — adjust per order if needed.</div>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {allowCompanyPicker
                    ? ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)
                    : (<><option>Pending</option><option>Completed</option></>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="modal-foot">
        {order && <button className="btn btn-danger-text" style={{ marginRight: 'auto' }} onClick={handleDelete}>Delete order</button>}
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>{order ? 'Save changes' : 'Add order'}</button>
      </div>
    </>
  );
}
