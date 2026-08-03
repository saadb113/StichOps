import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { isActive } from '../../lib/helpers';
import CustomerFormModal from './CustomerFormModal';

export default function CustomersList() {
  const { customers, orders, isAdmin, currentEmployee } = useAppState();
  const { openModal } = useUi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const base = isAdmin ? customers : customers.filter((c) => c.salesperson === currentEmployee?.name);
  const q = search.toLowerCase();
  const list = q ? base.filter((c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)) : base;

  const basePath = isAdmin ? '/customers' : '/my-customers';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">{isAdmin ? 'Customers' : 'My Customers'}</div>
          <div className="page-sub">{isAdmin ? `${customers.length} profiles` : `${base.length} customer${base.length === 1 ? '' : 's'} assigned to you`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="search"><span>&#128269;</span><input placeholder="Search name or company..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => openModal(<CustomerFormModal />)}>+ Add customer</button>
        </div>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Company</th><th>Contact</th><th>Country</th><th>Currency</th>
              {isAdmin && <th>Salesperson</th>}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={isAdmin ? 7 : 6} className="empty">
                {search ? `No customers match "${search}".` : <><i>No customers yet</i>Add your first customer to get started.</>}
              </td></tr>
            )}
            {list.map((c) => {
              const active = isActive(orders, c);
              return (
                <tr className="clickable" key={c.id} onClick={() => navigate(`${basePath}/${c.id}`)}>
                  <td style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 12 }}>{c.customerCode || '—'}</td>
                  <td><strong>{c.company}</strong></td>
                  <td>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.currency}</td>
                  {isAdmin && <td>{c.salesperson}</td>}
                  <td><span className={`badge ${active ? 'b-active' : 'b-inactive'}`}>{active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
