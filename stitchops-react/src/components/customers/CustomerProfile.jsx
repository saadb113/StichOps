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
import { ArrowLeftIcon, PlusIcon, PencilIcon, BagOutlineSmallIcon, DocIcon, ClockIcon, WarningIcon } from '../icons/Icon';

function elgStatusClass(status) {
  if (status === 'Free Trial') return 'elg-badge-inprogress';
  if (status === 'Paid') return 'elg-badge-completed';
  return 'elg-badge-cancelled';
}

export default function CustomerProfile() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const { getCustomer, orders, invoices, isAdmin, setCustomerStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  const c = getCustomer(id);
  if (!c) return <div className="elg-page"><div className="elg-empty">Customer not found.</div></div>;

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
    <div className="elg-page">
      <div className="elg-back-link" onClick={() => navigate(isAdmin ? '/customers' : '/my-customers')}>
        <img src="/icons/customers-back-btn.svg" alt="" /> Back
      </div>

      <div className="elg-profile-head">
        <div className="elg-profile-id">
          <div className="elg-avatar-lg">{initials}</div>
          <div>
            <div className="elg-profile-name-row">
              <div className="elg-profile-name">{c.company}</div>
              <span className={`elg-badge ${active ? 'elg-badge-active' : 'elg-badge-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="elg-profile-sub">{c.customerCode || '—'} &middot; {c.name} &middot; {c.email}</div>
          </div>
        </div>
        {isAdmin && (
          <div className="elg-profile-actions">
            <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={() => openModal(<OrderFormModal customerId={c.id} />, { variant: 'elegant' })}>
              <PlusIcon /> Add Order
            </button>
            <button className="elg-btn" style={{ width: 'auto' }} onClick={() => openModal(<CustomerFormModal customer={c} />, { variant: 'elegant' })}>
              <img src="/images/edit.svg" alt="" /> Edit Profile
            </button>
          </div>
        )}
      </div>

      {isAdmin && overdue.length > 0 && (
        <div className="elg-alert">
          <WarningIcon />
          <div>
            {c.company} hasn't paid {overdue.length > 1 ? 'invoices' : 'invoice'}{' '}
            {overdue.map((i, idx) => (
              <span key={i.id}><strong>{i.invoiceNo}</strong> ({paymentBadge(i).label.replace('Unpaid — ', '')} overdue){idx < overdue.length - 1 ? ', ' : ''}</span>
            ))}. Consider resolving payment before adding new work.
          </div>
        </div>
      )}

      <div className="elg-profile-grid">
        <div>
          {isAdmin && (
            <div className="elg-tabs">
              <div className={`elg-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
                {tab === 'orders' ? <img src="/images/orderActive.svg" alt="" /> : <img src="/images/order.svg" alt="" />} Orders ({os.length})
              </div>
              <div className={`elg-tab ${isAdmin ? (tab === 'invoice' ? 'active' : '') : 'active'}`} onClick={() => setTab('invoice')}>
                {tab === 'invoice' ? <img src="/images/invactive.svg" alt="" /> : <img src="/images/invoice.svg" alt="" />} Invoice{uninvoiced.length ? ` · ${uninvoiced.length} ready` : ''}
              </div>
              <div className={`elg-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                {tab === 'history' ? <img src="/images/invHistoryActive.svg" alt="" /> : <img src="/images/invHistory.svg" alt="" />} Invoice History
              </div>
            </div>
          )}
          <div id="tabContent">
            {!isAdmin && <InvoiceTab customer={c} orders={os} />}
            {isAdmin && tab === 'orders' && <OrdersTab customer={c} orders={os} />}
            {isAdmin && tab === 'invoice' && <InvoiceTab customer={c} orders={os} onApproved={() => setTab('history')} onEditOrders={() => setTab('orders')} />}
            {isAdmin && tab === 'history' && <InvoiceHistoryTab customer={c} />}
          </div>
        </div>

        <div className="elg-profile-sidebar">
          <div className="elg-panel" style={{ marginBottom: 16 }}>
            <div className="elg-panel-head"><h3>Profile Details</h3></div>
            <div className="elg-panel-body">
              <div className="elg-kv">
                <div className="elg-kv-row"><span className="k">Customer ID</span><span className="v">{c.customerCode || '—'}</span></div>
                <div className="elg-kv-row"><span className="k">Country</span><span className="v">{c.country}</span></div>
                <div className="elg-kv-row"><span className="k">Default Currency</span><span className="v">{c.currency}</span></div>
                <div className="elg-kv-row"><span className="k">Contact</span><span className="v">{c.contact || '—'}</span></div>
                <div className="elg-kv-row"><span className="k">Client's Email</span><span className="v" style={{ fontWeight: 600 }}>{c.email || '—'}</span></div>
                {c.receivedEmail && <div className="elg-kv-row"><span className="k">Received Via</span><span className="v" style={{ fontSize: 12 }}>{c.receivedEmail}</span></div>}
                <div className="elg-kv-row">
                  <span className="k">Status</span>
                  {/* <span className="v">
                    <select
                      className="elg-status-pill-select"
                      value={c.status === 'Paid' ? 'Paid' : 'Free Trial'}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ background: c.status === 'Paid' ? 'var(--elg-green)' : 'var(--elg-orange)' }}
                    >
                      <option value="Free Trial">Free Trial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </span> */}
                  <span style={{ fontSize: 12 }} className={`elg-badge ${elgStatusClass(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                {isAdmin && <div className="elg-kv-row"><span className="k">Invoice Day</span><span className="v">{c.invoiceDay ? c.invoiceDay + ' of each month' : '—'}</span></div>}
              </div>
            </div>
          </div>

          <div className="elg-panel" style={{ marginBottom: 16 }}>
            <div className="elg-panel-head"><h3>Notes</h3></div>
            <div className="elg-panel-body">
              <div className="elg-kv-row" style={{ fontSize: 12.5, color: c.notes ? 'var(--elg-ink)' : 'var(--elg-ink-3)', lineHeight: 1.5 }}>{c.notes || '—'}</div>
            </div>
          </div>

          <div className="elg-panel">
            <div className="elg-panel-head"><h3>Salesperson</h3></div>
            <div className="elg-panel-body">
              <div className="elg-kv">
                <div className="elg-kv-row"><span className="k">Name</span><span className="v">{c.salesperson}</span></div>
                <div className="elg-kv-row"><span className="k">Commission</span><span className="v">{fmt(os.reduce((s, o) => s + commissionAmt(o), 0), c.currency)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
