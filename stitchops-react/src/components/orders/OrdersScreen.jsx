import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { matchesSearch, formatDate } from '../../lib/helpers';
import { SYM, TODAY, ORDER_STATUSES, CUSTOMER_CURRENCIES } from '../../lib/constants';
import OrderFormModal from './OrderFormModal';
import ConfirmDeleteOrderModal from './ConfirmDeleteOrderModal';
import CustomerFormModal from '../customers/CustomerFormModal';
import EmployeeFormModal from '../employees/EmployeeFormModal';
import MobileFilterModal from '../layout/MobileFilterModal';
import MobileFab from '../layout/MobileFab';
import RangeDateField from '../common/RangeDateField';
import { SearchIcon, CalendarIcon, PencilIcon, KebabIcon, PlusIcon, PersonIcon, FilterIcon, BagIcon, WarningIcon, ClockIcon, CheckIcon } from '../icons/Icon';
import { SkeletonMetricCards, SkeletonRows, SkeletonMobileCards } from '../common/Skeleton';

function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'Rush') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function OrdersScreen() {
  const { dataLoading, orders, getCustomer, setOrderStatus } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();

  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function onDocClick(e) { if (!e.target.closest('.elg-row-actions')) setOpenMenuId(null); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Pending/in-progress orders are what the sidebar's Orders badge counts,
  // so they need to stay visible here regardless of the selected date range
  // — otherwise the badge points at orders the date filter is hiding.
  const isNeedsAttention = (o) => o.status === 'Pending' || o.status === 'Rush';

  // The overview cards summarize the same date/currency/search-filtered set
  // the table shows, but never the status dropdown — picking a status to
  // narrow the table shouldn't zero out the other cards' counts.
  let statsBase = orders.slice();
  if (from) statsBase = statsBase.filter((o) => o.date >= from || isNeedsAttention(o));
  if (to) statsBase = statsBase.filter((o) => o.date <= to || isNeedsAttention(o));
  if (currency) statsBase = statsBase.filter((o) => o.currency === currency);
  if (search) {
    statsBase = statsBase.filter((o) => {
      const c = getCustomer(o.customerId);
      return matchesSearch(search, o.name, c?.company, c?.name, c?.salesperson);
    });
  }
  const rushCount = statsBase.filter((o) => o.status === 'Rush').length;
  const pendingCount = statsBase.filter((o) => o.status === 'Pending').length;
  const onHoldCount = statsBase.filter((o) => o.status === 'On hold').length;
  const completedCount = statsBase.filter((o) => o.status === 'Completed').length;

  let list = status ? statsBase.filter((o) => o.status === status) : statsBase;
  list = list.sort((a, b) => {
    // Rush, then Pending, are pinned above everything else regardless of
    // date. Every other status shares one rank so the rest of the list
    // keeps its (newest-first) order — cycling an order between Completed /
    // On hold / Cancelled must not reshuffle its position among them.
    const rank = (s) => (s === 'Rush' ? 0 : s === 'Pending' ? 1 : 2);
    const statusDiff = rank(a.status) - rank(b.status);
    return statusDiff !== 0 ? statusDiff : b.id - a.id;
  });

  // Starting a fresh search clears the date range so results aren't
  // silently narrowed to whatever range happens to be selected — matching
  // orders from every date show up. Picking a range afterward re-applies it
  // on top of the search.
  function handleSearchChange(v) {
    if (v && !search) { setFrom(''); setTo(''); }
    setSearch(v);
  }

  function handleDelete(o) {
    setOpenMenuId(null);
    openModal(<ConfirmDeleteOrderModal order={o} />, { variant: 'elegant' });
  }

  function cycleStatus(o) {
    const idx = ORDER_STATUSES.indexOf(o.status);
    const next = ORDER_STATUSES[(idx + 1) % ORDER_STATUSES.length];
    setOrderStatus(o.id, next).catch((err) => toast(err.message));
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
        <div className="elg-page-head-range">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} align="right" />
        </div>
      </div>

      <div className="elg-panel elg-filterbar">
        <div className="elg-field-search">
          <img src="/icons/nav-search-icon.svg" alt="Search" />
          <input placeholder="Search order or customer" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="elg-filterbar-actions">
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <select className="elg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="elg-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">All Currencies</option>
            {CUSTOMER_CURRENCIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
          </select>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}>
            <PlusIcon /> Add Order
          </button>
        </div>
        <button
          className="elg-mobile-filter-btn"
          title="Filter"
          onClick={() => openModal(
            <MobileFilterModal
              title="Filter Orders"
              fields={[
                { key: 'status', label: 'Status', allLabel: 'All Status', options: ORDER_STATUSES.map((s) => ({ value: s, label: s })) },
                { key: 'currency', label: 'Currency', allLabel: 'All Currencies', options: CUSTOMER_CURRENCIES.map((cc) => ({ value: cc, label: cc })) }
              ]}
              values={{ status, currency }}
              onApply={(v) => { setStatus(v.status); setCurrency(v.currency); }}
            />,
            { variant: 'elegant' }
          )}
        >
          <FilterIcon />
        </button>
      </div>

      <div className="elg-mobile-filter-chips">
        {status && <span className="elg-mobile-filter-chip">{status}<button onClick={() => setStatus('')}>&times;</button></span>}
        {currency && <span className="elg-mobile-filter-chip">{currency} {SYM[currency]}<button onClick={() => setCurrency('')}>&times;</button></span>}
      </div>
      <div className="elg-metric-grid">
        {dataLoading ? (<SkeletonMetricCards labels={['Total Orders', 'Rush Orders', 'Pending / On Hold Orders', 'Completed Orders']} />) : (<>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Total Orders</span><span className="elg-metric-icon"><img src="/images/todays-order.svg" alt="" /></span></div>
          <div className="elg-metric-value">{statsBase.length}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Rush Orders</span><span className="elg-metric-icon"><img src="/images/rush-orders.svg" alt="" /></span></div>
          <div className="elg-metric-value">{rushCount}</div>
          <div className="elg-metric-sub">Needs urgent attention</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Pending / On Hold Orders</span><span className="elg-metric-icon"><img src="/images/pending-orders.svg" alt="" /></span></div>
          <div className="elg-metric-value">{pendingCount + onHoldCount}</div>
          <div className="elg-metric-sub">{pendingCount} pending &amp; {onHoldCount} on hold</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Completed Orders</span><span className="elg-metric-icon"><img src="/images/completed-orders.svg" alt="" /></span></div>
          <div className="elg-metric-value">{completedCount}</div>
          <div className="elg-metric-sub">Across all currencies</div>
        </div>
        </>)}
      </div>

      <div className="elg-mobile-cards">
        {dataLoading ? (<SkeletonMobileCards />) : (<>
        {list.length === 0 && <div className="elg-empty">No orders match these filters.</div>}
        {list.map((o) => {
          const c = getCustomer(o.customerId);
          return (
            <div key={o.id} className="elg-mobile-card">
              <div className="elg-mobile-card-head" onClick={() => navigate(`/customers/${o.customerId}`)}>
                <div className="elg-mobile-card-title">{o.name}</div>
                <div className="elg-row-actions" onClick={(ev) => ev.stopPropagation()}>
                  <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
                  {openMenuId === o.id && (
                    <div className="elg-row-menu">
                      <button onClick={() => { setOpenMenuId(null); openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' }); }}>
                        <img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /> Edit
                      </button>
                      <button className="elg-btn-danger-text" onClick={() => handleDelete(o)}>Delete order</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="elg-mobile-card-row"><PersonIcon width={14} height={14} />{c ? `${c.company} · ${c.name}` : '—'}</div>
              <div className="elg-mobile-card-foot">
                <span className={`elg-badge clickable ${elgStatusClass(o.status)}`} onClick={() => cycleStatus(o)} title="Click to advance status">{o.status}</span>
                <span className="elg-mobile-card-price">{SYM[o.currency]}{o.price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
        </>)}
      </div>

      <MobileFab
        onAddOrder={() => openModal(<OrderFormModal allowCompanyPicker />, { variant: 'elegant' })}
        onAddCustomer={() => openModal(<CustomerFormModal />, { variant: 'elegant' })}
        onAddEmployee={() => openModal(<EmployeeFormModal />, { variant: 'elegant' })}
      />

      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Order</th><th>Status</th><th>Currency</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {dataLoading ? (<SkeletonRows cols={7} />) : (<>
            {list.length === 0 && <tr><td colSpan={7} className="elg-empty">No orders match these filters.</td></tr>}
            {list.map((o) => {
              const c = getCustomer(o.customerId);
              return (
                <tr key={o.id} className="clickable">
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{formatDate(o.date)}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{c ? `${c.company} · ${c.name}` : '—'}</td>
                  <td onClick={() => navigate(`/customers/${o.customerId}`)}>{o.name}</td>
                  <td><span className={`elg-badge clickable ${elgStatusClass(o.status)}`} onClick={() => cycleStatus(o)} title="Click to advance status">{o.status}</span></td>
                  <td>{o.currency} {SYM[o.currency]}</td>
                  <td>{o.price.toFixed(2)}</td>
                  <td>
                    <div className="elg-row-actions">
                      <button className="elg-icon-sq" title="Edit" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}><img src="/icons/pencil-icon.svg" alt="Edit" width="14" height="14" /></button>
                      <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}><img src="/icons/filter-actions-dot-icon.svg" alt="More" /></button>
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
            </>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
