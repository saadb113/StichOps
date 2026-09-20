import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersFor, isActive, commissionAmt, customerOverdueInvoices, paymentBadge, convertToDefault } from '../../lib/helpers';
import OrderFormModal from '../orders/OrderFormModal';
import CustomerFormModal from './CustomerFormModal';
import ConfirmDeleteCustomerModal from './ConfirmDeleteCustomerModal';
import OrdersTab from './OrdersTab';
import InvoiceTab from './InvoiceTab';
import InvoiceHistoryTab from './InvoiceHistoryTab';
import { ArrowLeftIcon, PlusIcon, PencilIcon, BagOutlineSmallIcon, DocIcon, ClockIcon, WarningIcon, KebabIcon } from '../icons/Icon';

function elgStatusClass(status) {
  if (status === 'Free Trial') return 'elg-badge-inprogress';
  if (status === 'Paid') return 'elg-badge-completed';
  return 'elg-badge-cancelled';
}

export default function CustomerProfile() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const { getCustomer, orders, invoices, isAdmin, company, currencyRates, setCustomerStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [mobileView, setMobileView] = useState('content');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const defaultCurrency = company?.defaultCurrency || 'PKR';

  useEffect(() => {
    function onDocClick(ev) { if (!ev.target.closest('.elg-row-actions')) setMenuOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

      <div className="elg-mobile-profile-header">
        <button className="elg-mobile-back" onClick={() => navigate(isAdmin ? '/customers' : '/my-customers')}><ArrowLeftIcon /></button>
        <div className="elg-mobile-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="elg-mobile-card-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</div>
          <div className="elg-mobile-card-subtitle">{c.customerCode || '—'}</div>
        </div>
        <button className={`elg-icon-sq elg-customer-toggle-btn edit-toggle-btn ${mobileView === 'details' ? 'active' : ''}`} title="Profile Details" onClick={() => setMobileView((v) => (v === 'details' ? 'content' : 'details'))}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.91797 8.33333C2.91797 5.19064 2.91797 3.61929 3.9553 2.64298C4.99263 1.66667 6.66219 1.66667 10.0013 1.66667H10.6452C13.3629 1.66667 14.7217 1.66667 15.6654 2.33153C15.9358 2.52202 16.1758 2.74794 16.3782 3.00241C17.0846 3.89056 17.0846 5.16946 17.0846 7.72727V9.84848C17.0846 12.3178 17.0846 13.5524 16.6939 14.5385C16.0656 16.1238 14.737 17.3743 13.0527 17.9655C12.0049 18.3333 10.6931 18.3333 8.06948 18.3333C6.57026 18.3333 5.82065 18.3333 5.22195 18.1232C4.25946 17.7853 3.50026 17.0708 3.14127 16.1649C2.91797 15.6014 2.91797 14.8959 2.91797 13.4848V8.33333Z" stroke="#191919" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M17.0833 10C17.0833 11.5341 15.8397 12.7778 14.3056 12.7778C13.7507 12.7778 13.0966 12.6806 12.5572 12.8251C12.0779 12.9535 11.7035 13.3279 11.5751 13.8072C11.4306 14.3466 11.5278 15.0007 11.5278 15.5556C11.5278 17.0897 10.2841 18.3333 8.75 18.3333" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.66797 5.83333H12.5013" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.66797 9.16667H9.16797" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        {isAdmin && (
          <div className="elg-row-actions">
            <button className="elg-icon-sq edit-toggle-btn" title="More" onClick={() => setMobileMenuOpen((v) => !v)}><img alt="More" src="/icons/filter-actions-dot-icon.svg" /></button>
            {mobileMenuOpen && (
              <div className="elg-row-menu">
                <button onClick={() => { setMobileMenuOpen(false); openModal(<OrderFormModal customerId={c.id} />, { variant: 'elegant' }); }}>
                  <PlusIcon width={14} height={14} /> Add Order
                </button>
                <button onClick={() => { setMobileMenuOpen(false); openModal(<CustomerFormModal customer={c} />, { variant: 'elegant' }); }}>
                  <img src="/images/edit.svg" alt="" width={14} height={14} /> Edit Profile
                </button>
              </div>
            )}
          </div>
        )}
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
            <div className="elg-row-actions">
              <button
                className="elg-btn transparent"
                style={{ width: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setMenuOpen((v) => !v)}
                title="Settings"
                aria-label="Settings"
              >
                <img src="/icons/filter-actions-dot-icon.svg" alt="More" />
              </button>
              {menuOpen && (
                <div className="elg-row-menu">
                  <button onClick={() => { setMenuOpen(false); openModal(<CustomerFormModal customer={c} />, { variant: 'elegant' }); }}>
                    <img src="/images/edit.svg" alt="" width={14} height={14} /> Edit
                  </button>
                  <button className="elg-btn-danger-text" onClick={() => { setMenuOpen(false); openModal(<ConfirmDeleteCustomerModal customerId={c.id} company={c.company} />, { variant: 'elegant' }); }}>
                    <img src="/icons/delete-red-icon.svg" width={12} alt="" /> Delete
                  </button>
                </div>
              )}
            </div>
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

      <div className={`elg-profile-grid elg-mobile-view-${mobileView}`}>
        <div className="elg-mobile-tab-content-col">
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
            {isAdmin && tab === 'invoice' && <InvoiceTab customer={c} orders={os} />}
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
                <div className="elg-kv-row"><span className="k">Client's Email</span><span className="v">{c.email || '—'}</span></div>
                {c.receivedEmail && <div className="elg-kv-row"><span className="k">Received Via</span><span className="v">{c.receivedEmail}</span></div>}
                <div className="elg-kv-row">
                  <span className="k">Customer Type</span>
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
                <div className="elg-kv-row"><span className="k">Commission</span><span className="v">{(() => {
                  let total = 0; let unknown = false;
                  os.forEach((o) => {
                    const converted = convertToDefault(commissionAmt(o), o.currency, currencyRates, defaultCurrency);
                    if (converted == null) unknown = true;
                    else total += converted;
                  });
                  return unknown ? '—' : fmt(total, defaultCurrency);
                })()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
