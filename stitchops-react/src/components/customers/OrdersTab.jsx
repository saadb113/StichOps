import { Fragment, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt, convertToDefault } from '../../lib/helpers';
import { ORDER_STATUSES } from '../../lib/constants';
import OrderFormModal from '../orders/OrderFormModal';
import ConfirmDeleteOrderModal from '../orders/ConfirmDeleteOrderModal';
import { PencilIcon, KebabIcon, MessageIcon, CoinIcon, CalendarIcon, PersonIcon, DocIcon } from '../icons/Icon';

function statusPillStyle(status) {
  const map = {
    Completed: { bg: 'var(--elg-green)', fg: '#fff' },
    Pending: { bg: 'var(--elg-red)', fg: '#fff' },
    'In Progress': { bg: 'var(--elg-orange)', fg: '#fff' },
    'On Hold': { bg: 'var(--elg-navy)', fg: '#fff' },
    Cancelled: { bg: 'var(--elg-gray)', fg: '#5B5F6B' }
  };
  return map[status] || map.Pending;
}
function elgStatusClass(status) {
  if (status === 'Completed') return 'elg-badge-completed';
  if (status === 'Pending') return 'elg-badge-pending';
  if (status === 'In progress') return 'elg-badge-inprogress';
  if (status === 'On hold') return 'elg-badge-onhold';
  return 'elg-badge-cancelled';
}

export default function OrdersTab({ customer, orders }) {
  const { isAdmin, company, currencyRates, setOrderStatus, addComment } = useAppState();
  const { openModal, toast } = useUi();
  const defaultCurrency = company?.defaultCurrency || 'PKR';
  const [openCommentId, setOpenCommentId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  if (!orders.length) {
    return <div className="elg-panel"><div className="elg-empty">No orders yet — add the first order for {customer.company}.</div></div>;
  }

  async function handleStatusChange(o, status) {
    try {
      await setOrderStatus(o.id, status);
      toast('Status set to ' + status + '.');
    } catch (e) {
      toast(e.message);
    }
  }
  function cycleStatus(o) {
    const idx = ORDER_STATUSES.indexOf(o.status);
    handleStatusChange(o, ORDER_STATUSES[(idx + 1) % ORDER_STATUSES.length]);
  }
  async function handlePostComment(orderId) {
    const text = (commentDrafts[orderId] || '').trim();
    if (!text) return;
    setCommentDrafts((d) => ({ ...d, [orderId]: '' }));
    try {
      await addComment(orderId, text);
    } catch (e) {
      toast(e.message);
    }
  }
  function handleDelete(o) {
    setOpenMenuId(null);
    openModal(<ConfirmDeleteOrderModal order={o} />, { variant: 'elegant' });
  }

  return (
    <div className="elg-panel">
      <div className="elg-mobile-cards">
        {orders.map((o) => {
          const prodCostConverted = convertToDefault(o.productionCost, o.productionCostCurrency || o.currency, currencyRates, defaultCurrency);
          const commissionConverted = convertToDefault(commissionAmt(o), o.currency, currencyRates, defaultCurrency);
          return (
            <div key={o.id} className="elg-mobile-card">
              <div className="elg-mobile-card-head">
                <div className="elg-mobile-card-title">{o.name}</div>
                {isAdmin && (
                  <div className="elg-row-actions">
                    <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}>
                      <img src="/icons/filter-actions-dot-icon.svg" alt="More" />
                    </button>
                    {openMenuId === o.id && (
                      <div className="elg-row-menu">
                        <button onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}>
                          <img src="/icons/pencil-icon.svg" width={12} alt="Edit Icon" /> Edit order
                        </button>
                        <button className="elg-btn-danger-text" onClick={() => handleDelete(o)}>
                          <img src="/icons/delete-red-icon.svg" alt="Delete Icon" /> Delete order
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="elg-mobile-card-row">
                <CoinIcon width={14} height={14} />
                {commissionConverted == null ? '—' : fmt(commissionConverted, defaultCurrency)} Commission ({o.commissionRate}%)
              </div>
              <div className="elg-mobile-card-row"><CalendarIcon width={14} height={14} />{o.date}</div>
              <div className="elg-mobile-card-2col">
                <div className="elg-mobile-card-row"><PersonIcon width={14} height={14} />{o.designer}</div>
                <div className="elg-mobile-card-row"><DocIcon width={14} height={14} />{prodCostConverted == null ? '—' : fmt(prodCostConverted, defaultCurrency)}</div>
              </div>
              <div className="elg-mobile-card-foot">
                <span
                  className={`elg-badge ${elgStatusClass(o.status)} ${isAdmin ? 'clickable' : ''}`}
                  onClick={isAdmin ? () => cycleStatus(o) : undefined}
                  title={isAdmin ? 'Click to advance status' : undefined}
                >
                  {o.status}
                </span>
                <span className="elg-mobile-card-price">
                  {fmt(o.price, o.currency)}{o.currency !== customer.currency && <span style={{ color: 'var(--elg-ink-3)', fontSize: 11, fontWeight: 400 }}> · overridden</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="elg-table-wrap">
      <table className="elg-table">
        <thead><tr><th>Order</th><th>Date</th><th>Price</th><th>Designer</th><th>Prod. Cost</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const commentOpen = openCommentId === o.id;
            const count = o.comments.length;
            const prodCostConverted = convertToDefault(o.productionCost, o.productionCostCurrency || o.currency, currencyRates, defaultCurrency);
            const commissionConverted = convertToDefault(commissionAmt(o), o.currency, currencyRates, defaultCurrency);
            return (
              <Fragment key={o.id}>
                <tr>
                  <td>{o.name}</td>
                  <td>{o.date}</td>
                  <td>{fmt(o.price, o.currency)} {o.currency !== customer.currency && <span style={{ color: 'var(--elg-ink-3)', fontSize: 11 }}>· overridden</span>}</td>
                  <td>{o.designer}</td>
                  <td>{prodCostConverted == null ? '—' : fmt(prodCostConverted, defaultCurrency)}</td>
                  <td>{commissionConverted == null ? '—' : fmt(commissionConverted, defaultCurrency)} <span className="elg-comm-pct">({o.commissionRate}%)</span></td>
                  <td>
                    <span
                      className={`elg-badge ${elgStatusClass(o.status)} ${isAdmin ? 'clickable' : ''}`}
                      onClick={isAdmin ? () => cycleStatus(o) : undefined}
                      title={isAdmin ? 'Click to advance status' : undefined}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <div className="elg-row-actions">
                     
                      {isAdmin && (
                        <button className="elg-icon-sq" title="More" onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}>
                          <img src="/icons/filter-actions-dot-icon.svg" alt="More" />
                        </button>
                      )}
                      {openMenuId === o.id && (
                        <div className="elg-row-menu">
                          <button className="" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />, { variant: 'elegant' })}>
                            <img src="/icons/pencil-icon.svg" width={12} alt="Edit Icon" />
                            Edit order
                          </button>
                          <button className="elg-btn-danger-text" onClick={() => handleDelete(o)}>
                            <img src="/icons/delete-red-icon.svg" alt="Delete Icon" />
                            Delete order
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
