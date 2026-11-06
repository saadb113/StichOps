import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM, ORDER_STATUSES, TODAY, CUSTOMER_CURRENCIES } from '../../lib/constants';
import { customerOverdueInvoices, paymentBadge } from '../../lib/helpers';
import { api } from '../../lib/api';
import { useScope } from '../../store/ScopedData';
import { BagIcon, CloseIcon, WarningIcon, ChevronDownIcon } from '../icons/Icon';
const addOrderImg = '/images/addOrder.svg';

// Searches customers on the server as you type (first 20 matches), so the
// picker works the same with 50 customers or 50,000.
function CustomerPicker({ selected, onSelect, danger }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const n = ++seq.current;
    setSearching(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (query.trim()) params.set('search', query.trim());
      api.get(`/customers?${params.toString()}`)
        .then((r) => { if (n === seq.current) setResults(r.items); })
        .catch(() => { if (n === seq.current) setResults([]); })
        .finally(() => { if (n === seq.current) setSearching(false); });
    }, 200);
    return () => clearTimeout(t);
  }, [open, query]);

  function pick(c) {
    onSelect(c);
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
      </div>
      {open && (
        <div className="elg-customer-picker-list">
          {results.length === 0 && (
            <div className="elg-customer-picker-empty">{searching ? 'Searching…' : query ? `No customers match "${query}".` : 'No customers yet.'}</div>
          )}
          {results.map((c) => (
            <div
              key={c.id}
              className={`elg-customer-picker-item ${selected && c.id === selected.id ? 'active' : ''}`}
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
    'Rush': { bg: 'var(--elg-orange)', fg: '#fff' },
    'On hold': { bg: 'var(--elg-navy)', fg: '#fff' },
    Cancelled: { bg: 'var(--elg-gray)', fg: '#5B5F6B' }
  };
  const s = map[status] || map.Pending;
  return { background: s.bg, color: s.fg };
}

// Custom dropdown (not a native <select>) so every option renders as its own
// colored capsule — a native select can't style its own option list.
function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(s) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div className="elg-status-dropdown" ref={ref}>
      <button type="button" className="elg-status-box elg-status-dropdown-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="elg-status-pill-select" style={statusPillStyle(value)}>{value}</span>
        <ChevronDownIcon className="elg-status-chevron" />
      </button>
      {open && (
        <div className="elg-status-dropdown-list">
          {ORDER_STATUSES.map((s) => (
            <div key={s} className="elg-status-dropdown-item" onClick={() => pick(s)}>
              <span className="elg-status-pill-select" style={statusPillStyle(s)}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderFormModal({ customerId = null, order = null, allowCompanyPicker = false }) {
  const { employees, designers, company, addOrder, updateOrder, deleteOrder } = useAppState();
  const { closeModal, toast } = useUi();
  const defaultCurrency = company?.defaultCurrency || 'PKR';

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  // Just this customer and their invoices (for the overdue warning).
  const scope = useScope(selectedCustomerId ? { customerId: Number(selectedCustomerId), collections: 'invoices' } : null);
  const [pickedCustomer, setPickedCustomer] = useState(null);
  const cust = scope.getCustomer(Number(selectedCustomerId))
    || (pickedCustomer && pickedCustomer.id === Number(selectedCustomerId) ? pickedCustomer : null);
  const invoices = scope.invoices;

  const [name, setName] = useState(order ? order.name : '');
  const [date, setDate] = useState(order ? order.date : TODAY);
  const [price, setPrice] = useState(order ? order.price : '');
  const [currency, setCurrency] = useState(order ? order.currency : (cust ? cust.currency : ''));
  const [designer, setDesigner] = useState(order ? order.designer : (designers[0]?.name || ''));
  const [cost, setCost] = useState(order ? order.productionCost : 400);
  const [commission, setCommission] = useState(() => {
    if (order) return order.commissionRate;
    const salespersonEmp = cust ? employees.find((emp) => emp.name === cust.salesperson) : null;
    return salespersonEmp ? salespersonEmp.commissionRate : 10;
  });
  const [status, setStatus] = useState(order ? order.status : 'Pending');

  const showPicker = allowCompanyPicker && !order;

  // A preset customer (e.g. "Add Order" on their profile) arrives after the
  // form opens — fill in their currency and commission once it does.
  const filledFor = useRef(order ? Number(selectedCustomerId) : null);
  useEffect(() => {
    if (!cust || order || filledFor.current === cust.id) return;
    filledFor.current = cust.id;
    setCurrency(cust.currency);
    const salespersonEmp = employees.find((emp) => emp.name === cust.salesperson);
    setCommission(salespersonEmp ? salespersonEmp.commissionRate : 10);
  }, [cust, order, employees]);

  function handleCompanyChange(c) {
    setPickedCustomer(c);
    setSelectedCustomerId(c.id);
    filledFor.current = c.id;
    if (c) {
      setCurrency(c.currency);
      // Commission is the salesperson's own configured rate — never a value
      // typed here — so a new order always locks to whatever their profile says.
      const salespersonEmp = employees.find((emp) => emp.name === c.salesperson);
      setCommission(salespersonEmp ? salespersonEmp.commissionRate : 10);
    }
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
    <div className="elg-add-order-modal">
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
              selected={cust}
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
                <div className="elg-info-row"><span className="k">Salesperson</span><span className="v">{cust.salesperson || '—'}</span></div>
                <div className="elg-info-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <span className="k">Notes</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', wordBreak: 'break-word' }}>{cust.notes || '—'}</span>
                </div>
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
                    {CUSTOMER_CURRENCIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
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
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="400" />
                  <span className="elg-price-field-fixed-ccy">{SYM[defaultCurrency]}</span>
                </div>
              </div>
            </div>

            <div className="elg-field-row">
              <div className="elg-field">
                <label>Commission Rate</label>
                <div className="elg-price-field">
                  <input type="number" value={commission} disabled title="Set on the salesperson's own profile — not editable here" />
                  <span className="elg-price-field-fixed-ccy">%</span>
                </div>
              </div>
              <div className="elg-field">
                <label>Status</label>
                <StatusDropdown value={status} onChange={setStatus} />
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
    </div>
  );
}
