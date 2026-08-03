import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, statusBadgeClass } from '../../lib/helpers';
import { SYM, TODAY } from '../../lib/constants';
import OrderFormModal from './OrderFormModal';

export default function OrdersScreen() {
  const { orders, getCustomer } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();

  const [date, setDate] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');

  let list = orders.slice();
  if (date) list = list.filter((o) => o.date === date);
  if (currency) list = list.filter((o) => o.currency === currency);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((o) => {
      const c = getCustomer(o.customerId);
      return o.name.toLowerCase().includes(q) || (c && (c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
    });
  }
  list = list.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-sub">{date ? 'Showing ' + date : 'Showing all dates'} &middot; {list.length} order{list.length === 1 ? '' : 's'}</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(<OrderFormModal allowCompanyPicker />)}>+ Add order</button>
      </div>
      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }} />
          <button className="btn btn-sm" onClick={() => setDate('')}>Show all dates</button>
          <div className="search" style={{ width: 240 }}>
            <span>&#128269;</span>
            <input placeholder="Search order or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font)' }}>
            <option value="">All currencies</option>
            {Object.keys(SYM).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
          </select>
        </div>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="empty">No orders match these filters.</td></tr>}
            {list.map((o) => {
              const c = getCustomer(o.customerId);
              return (
                <tr key={o.id}>
                  <td className="clickable" onClick={() => navigate(`/customers/${o.customerId}`)}>{o.name}</td>
                  <td className="clickable" onClick={() => navigate(`/customers/${o.customerId}`)}>{c ? c.company : '—'}</td>
                  <td>{o.date}</td>
                  <td>{fmt(o.price, o.currency)}</td>
                  <td><span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />)}>&#8942;</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
