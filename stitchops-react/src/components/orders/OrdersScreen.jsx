import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { commissionAmt } from '../../lib/helpers';
import { SYM, TODAY, ORDER_STATUSES } from '../../lib/constants';
import OrderFormModal from './OrderFormModal';
import { SearchIcon, CalendarIcon, PencilIcon, KebabIcon, PlusIcon } from '../icons/Icon';

function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'In progress') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function OrdersScreen() {
  const { orders, getCustomer, deleteOrder } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [date, setDate] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  let list = orders.slice();
  if (date) list = list.filter((o) => o.date === date);
  if (currency) list = list.filter((o) => o.currency === currency);
  if (status) list = list.filter((o) => o.status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((o) => {
      const c = getCustomer(o.customerId);
      return o.name.toLowerCase().includes(q) || (c && (c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
    });
  }
  list = list.sort((a, b) => b.date.localeCompare(a.date));

  async function handleDelete(o) {
    setOpenMenuId(null);
    try {
      await deleteOrder(o.id);
      toast('Order deleted.');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Orders</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Orders</div>
          <div className="elg-page-sub">{list.length} order{list.length === 1 ? '' : 's'} listed</div>
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <SearchIcon />
          <input placeholder="Search order or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="elg-date-field">
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <CalendarIcon />
          </span>
          {date && <button className="elg-date-clear" title="Clear date" onClick={() => setDate('')}>&times;</button>}
        </div>
        <select className="elg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="">All Currencies</option>
          {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
        </select>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
          <PlusIcon /> Add Order
        </button>
      </div>

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Currency</th><th>Price</th><th>Commission</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="elg-empty">No orders match these filters.</td></tr>}
            {list.map((o) => {
              const c = getCustomer(o.customerId);
              return (
                <tr key={o.id} className="clickable">
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{o.name}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{c ? c.company : '—'}</td>
                  <td><span className={`elg-badge ${elgStatusClass(o.status)}`}>{o.status}</span></td>
                  <td>{o.currency} {SYM[o.currency]}</td>
                  <td>{o.price.toFixed(2)}</td>
                  <td>{commissionAmt(o).toFixed(2)} <span className="elg-comm-pct">({o.commissionRate}%)</span></td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="Edit" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}><img src="/images/edit.png"/></button>
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><KebabIcon /></button>
                      {openMenuId === o.id && (
                        <div className="elg-row-menu">
                          <button className="elg-btn-danger-text" onClick={() => handleDelete(o)}>Delete order</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
