import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersFor, isActive, commissionAmt, customerOverdueInvoices, paymentBadge } from '../../lib/helpers';
import OrderFormModal from '../orders/OrderFormModal';
import CustomerFormModal from './CustomerFormModal';
import OrdersTab from './OrdersTab';
import InvoiceTab from './InvoiceTab';
import InvoiceHistoryTab from './InvoiceHistoryTab';

export default function CustomerProfile() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const { getCustomer, orders, invoices, isAdmin, setCustomerStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  const c = getCustomer(id);
  if (!c) return <div className="empty">Customer not found.</div>;

  const os = ordersFor(orders, c.id);
  const initials = c.company.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const active = isActive(orders, c);
  const uninvoiced = os.filter((o) => !o.invoiced && o.status === 'Completed');
  const overdue = customerOverdueInvoices(invoices, c.id);

  async function handleStatusChange(status) {
    try {
      await setCustomerStatus(c.id, status);
      toast('Status set to ' + status + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-sub" style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }} onClick={() => navigate(isAdmin ? '/customers' : '/my-customers')}>
            &larr; {isAdmin ? 'All customers' : 'My customers'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button className="btn" onClick={() => openModal(<OrderFormModal customerId={c.id} />)}>+ Add order</button>}
          {isAdmin && <button className="btn" onClick={() => openModal(<CustomerFormModal customer={c} />)}>Edit profile</button>}
        </div>
      </div>

      {isAdmin && overdue.length > 0 && (
        <div className="flag" style={{ background: 'var(--red-soft)', color: 'var(--red-ink)', borderColor: '#E3AFA9' }}>
          <span>&#9888;</span>
          <div>
            {c.company} hasn't paid {overdue.length > 1 ? 'invoices' : 'invoice'}{' '}
            {overdue.map((i, idx) => (
              <span key={i.id}><strong>{i.invoiceNo}</strong> ({paymentBadge(i).label.replace('Unpaid — ', '')} overdue){idx < overdue.length - 1 ? ', ' : ''}</span>
            ))}.
          </div>
        </div>
      )}

      <div className="profile-head">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{c.company}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.customerCode || '—'} &middot; {c.name} &middot; {c.email}</div>
          </div>
        </div>
        <span className={`badge ${active ? 'b-active' : 'b-inactive'}`} style={{ fontSize: 12, padding: '5px 12px' }}>{active ? 'Active' : 'Inactive'}</span>
      </div>

      <div className="profile-grid">
        <div>
          <div className="tabs">
            {isAdmin && <div className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders ({os.length})</div>}
            <div className={`tab ${isAdmin ? (tab === 'invoice' ? 'active' : '') : 'active'}`} onClick={() => setTab('invoice')}>
              Invoice {uninvoiced.length ? `· ${uninvoiced.length} ready` : ''}
            </div>
            {isAdmin && <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Invoice history</div>}
          </div>
          <div id="tabContent">
            {!isAdmin && <InvoiceTab customer={c} orders={os} />}
            {isAdmin && tab === 'orders' && <OrdersTab customer={c} orders={os} />}
            {isAdmin && tab === 'invoice' && <InvoiceTab customer={c} orders={os} onApproved={() => setTab('history')} />}
            {isAdmin && tab === 'history' && <InvoiceHistoryTab customer={c} />}
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head"><h3>Profile details</h3></div>
            <div style={{ padding: '16px 18px' }}>
              <div className="kv">
                <div className="kv-row"><span className="k">Customer ID</span><span className="v" style={{ fontFamily: 'var(--mono)' }}>{c.customerCode || '—'}</span></div>
                <div className="kv-row"><span className="k">Country</span><span className="v">{c.country}</span></div>
                <div className="kv-row"><span className="k">Default currency</span><span className="v">{c.currency}</span></div>
                <div className="kv-row"><span className="k">Contact</span><span className="v">{c.contact}</span></div>
                <div className="kv-row"><span className="k">Email client</span><span className="v">{c.emailClient}</span></div>
                <div className="kv-row"><span className="k">Salesperson</span><span className="v">{c.salesperson}</span></div>
                {c.receivedEmail && <div className="kv-row"><span className="k">Received via</span><span className="v" style={{ fontSize: 12 }}>{c.receivedEmail}</span></div>}
                <div className="kv-row">
                  <span className="k">Status</span>
                  <span className="v">
                    <select
                      value={c.status === 'Paid' ? 'Paid' : 'Free Trial'}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px', fontWeight: 700, borderRadius: 100, border: 'none', background: c.status === 'Paid' ? 'var(--accent-soft)' : 'var(--amber-soft)', color: c.status === 'Paid' ? 'var(--accent)' : 'var(--amber-ink)' }}
                    >
                      <option value="Free Trial">Free Trial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </span>
                </div>
                {isAdmin && <div className="kv-row"><span className="k">Invoice day</span><span className="v">{c.invoiceDay ? c.invoiceDay + ' of each month' : '—'}</span></div>}
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Notes</h3></div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '12.5px', color: c.notes ? 'var(--ink)' : 'var(--ink-3)' }}>{c.notes || '—'}</div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Commission summary</h3></div>
            <div style={{ padding: '16px 18px' }}>
              <div className="kv">
                <div className="kv-row"><span className="k">Total earned</span><span className="v">{fmt(os.reduce((s, o) => s + commissionAmt(o), 0), c.currency)}</span></div>
                <div className="kv-row"><span className="k">Salesperson</span><span className="v">{c.salesperson}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
