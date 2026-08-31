import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM, ORDER_STATUSES, TODAY } from '../../lib/constants';
import { customerOverdueInvoices, paymentBadge } from '../../lib/helpers';
import { BagIcon, CloseIcon, WarningIcon, ChevronDownIcon } from '../icons/Icon';
const addOrderImg = '/images/addOrder.svg';

function CustomerPicker({ customers, selectedCustomerId, onSelect, danger }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = customers.find((c) => c.id === Number(selectedCustomerId));

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) => c.company.toLowerCase().startsWith(q))
    : customers;

  function pick(c) {
    onSelect(c.id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="elg-customer-picker" ref={ref}>
      <div className={`elg-customer-picker-input ${danger ? 'elg-select-danger' : ''}`} onClick={() => setOpen(true)}>
        <img src="/icons/nav-search-icon.svg" alt="Search" />
        <input
          value={open ? query : (selected ? selected.company : '')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search or select a customer"
        />
        <ChevronDownIcon />
      </div>
      {open && (
        <div className="elg-customer-picker-list">
          {filtered.length === 0 && <div className="elg-customer-picker-empty">No customers match "{query}".</div>}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`elg-customer-picker-item ${c.id === Number(selectedCustomerId) ? 'active' : ''}`}
              onClick={() => pick(c)}
            >
              <span className="elg-customer-picker-item-name">{c.company}</span>
              <span className="elg-customer-picker-item-sub">{c.customerCode ? `${c.customerCode} · ` : ''}{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusPillStyle(status) {
  const map = {
    Completed: { bg: 'var(--elg-green)', fg: '#fff' },
    Pending: { bg: 'var(--elg-red)', fg: '#fff' },
    'In progress': { bg: 'var(--elg-orange)', fg: '#fff' },
    'On hold': { bg: 'var(--elg-navy)', fg: '#fff' },
    Cancelled: { bg: 'var(--elg-gray)', fg: '#5B5F6B' }
  };
  const s = map[status] || map.Pending;
  return { background: s.bg, color: s.fg };
}

export default function OrderFormModal({ customerId = null, order = null, allowCompanyPicker = false }) {
  const { customers, employees, company, getCustomer, invoices, addOrder, updateOrder, deleteOrder } = useAppState();
  const { closeModal, toast } = useUi();

  const designers = employees.filter((e) => e.role === 'Designer');
  const defaultCurrency = company?.defaultCurrency || 'PKR';

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const cust = selectedCustomerId ? getCustomer(Number(selectedCustomerId)) : null;

  const [name, setName] = useState(order ? order.name : '');
  const [date, setDate] = useState(order ? order.date : TODAY);
  const [price, setPrice] = useState(order ? order.price : '');
  const [currency, setCurrency] = useState(order ? order.currency : (cust ? cust.currency : ''));
  const [designer, setDesigner] = useState(order ? order.designer : (designers[0]?.name || ''));
  const [cost, setCost] = useState(order ? order.productionCost : 300);
  const [commission, setCommission] = useState(order ? order.commissionRate : 10);
  const [status, setStatus] = useState(order ? order.status : 'Pending');

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
      productionCostCurrency: defaultCurrency,
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
      <button className="elg-modal-close" onClick={closeModal}><img src="/icons/model-close-icon.svg" alt="Close" width="20" height="20" /></button>

      {order ? (
        <div className="elg-modal-head-plain">
          <h3>Edit order — {cust ? cust.company : ''}</h3>
        </div>
      ) : (
        <div className="elg-modal-hero">
          <div className="elg-modal-hero-icon"><img src={addOrderImg} alt="" /></div>
          <div className="elg-modal-title">Add Order</div>
          <div className="elg-modal-sub">{cust ? 'Add details to add your order!' : 'Select a company to continue with the order.'}</div>
        </div>
      )}

      <div className="elg-modal-body">
        {showPicker && (
          <div className="elg-field">
            <label>Company Name</label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelect={handleCompanyChange}
              danger={overdue.length > 0}
            />
          </div>
        )}

        {cust && overdue.length > 0 && (
          <div className="elg-alert">
            <WarningIcon />
            <div>
              {cust.company} hasn't paid {overdue.length > 1 ? 'invoices' : 'invoice'}{' '}
              {overdue.map((i, idx) => (
                <span key={i.id}>
                  <strong>{i.invoiceNo}</strong> ({paymentBadge(i).label.replace('Unpaid — ', '')} overdue){idx < overdue.length - 1 ? ', ' : ''}
                </span>
              ))}. Consider resolving payment before adding new work.
            </div>
          </div>
        )}

        {cust && (
          <>
            {allowCompanyPicker && (
              <div className="elg-info-panel">
                <div className="elg-info-row"><span className="k">Contact</span><span className="v">{cust.name}</span></div>
                <div className="elg-info-row"><span className="k">Phone</span><span className="v">{cust.contact}</span></div>
                <div className="elg-info-row"><span className="k">Email</span><span className="v">{cust.email}</span></div>
                <div className="elg-info-row"><span className="k">Country</span><span className="v">{cust.country}</span></div>
                <div className="elg-info-row"><span className="k">Currency</span><span className="v">{cust.currency}</span></div>
                <div className="elg-info-row"><span className="k">Salesperson</span><span className="v">{cust.salesperson}</span></div>
              </div>
            )}

            <div className="elg-field-row orderName">
              <div className="elg-field"><label>Order Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jacket Back" /></div>
              <div className="elg-field"><label>Date</label><span className='modal-elg-input'><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /> <img src="/images/calender.svg" alt="" /></span></div>
            </div>
            <div className="elg-field-row gr1">
              <div className="elg-field">
                <label>Price</label>
                <div className="elg-price-field">
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="elg-field-row">
              <div className="elg-field">
                <label>Designer</label>
                <select value={designer} onChange={(e) => setDesigner(e.target.value)}>{designers.map((d) => <option key={d.id}>{d.name}</option>)}</select>
              </div>
              <div className="elg-field">
                <label>Production Cost ({defaultCurrency})</label>
                <div className="elg-price-field">
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="300" />
                  <span className="elg-price-field-fixed-ccy">{SYM[defaultCurrency]}</span>
                </div>
              </div>
            </div>

            <div className="elg-field-row">
              <div className="elg-field"><label>Commission Rate (%)</label><input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} disabled={!order} title={!order ? 'Default commission — adjust it after the order is created' : undefined} /></div>
              <div className="elg-field">
                <label>Status</label>
                <div className="elg-status-box">
                  <select
                    className="elg-status-pill-select"
                    style={statusPillStyle(status)}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="elg-status-chevron" />
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      <div className={`elg-modal-foot ${order ? 'plain' : ''}`}>
        {order && <button className="elg-btn elg-btn-ghost elg-btn-danger-text" style={{ width: 'auto' }} onClick={handleDelete}>Delete Order</button>}
        <span className="spacer" />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>{order ? 'Save Changes' : 'Add Order'}</button>
      </div>
    </>
  );
}
