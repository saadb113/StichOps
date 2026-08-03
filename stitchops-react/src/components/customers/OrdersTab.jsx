import { Fragment, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt, statusSelectBg, statusSelectFg } from '../../lib/helpers';
import { ORDER_STATUSES } from '../../lib/constants';
import OrderFormModal from '../orders/OrderFormModal';

export default function OrdersTab({ customer, orders }) {
  const { isAdmin, setOrderStatus, addComment } = useAppState();
  const { openModal, toast } = useUi();
  const [openCommentId, setOpenCommentId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  if (!orders.length) {
    return <div className="panel"><div className="empty"><i>No orders yet</i>Add the first order for {customer.company}.</div></div>;
  }

  async function handleStatusChange(o, status) {
    try {
      await setOrderStatus(o.id, status);
      toast('Status set to ' + status + '.');
    } catch (e) {
      toast(e.message);
    }
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

  return (
    <div className="panel">
      <table>
        <thead><tr><th>Order</th><th>Date</th><th>Price</th><th>Designer</th><th>Prod. cost</th><th>Commission</th><th>Status</th><th></th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => {
            const open = openCommentId === o.id;
            const count = o.comments.length;
            return (
              <Fragment key={o.id}>
                <tr>
                  <td>{o.name}</td>
                  <td>{o.date}</td>
                  <td>{fmt(o.price, o.currency)} <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{o.currency !== customer.currency ? '· overridden' : ''}</span></td>
                  <td>{o.designer}</td>
                  <td>{fmt(o.productionCost, o.currency)}</td>
                  <td>{fmt(commissionAmt(o), o.currency)} <span style={{ color: 'var(--ink-3)' }}>({o.commissionRate}%)</span></td>
                  <td>
                    {isAdmin ? (
                      <select value={o.status} onChange={(e) => handleStatusChange(o, e.target.value)} style={{ width: 'auto', padding: '4px 8px', fontSize: '11.5px', fontWeight: 700, borderRadius: 100, border: 'none', background: statusSelectBg(o.status), color: statusSelectFg(o.status) }}>
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="badge" style={{ background: statusSelectBg(o.status), color: statusSelectFg(o.status) }}>{o.status}</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => setOpenCommentId(open ? null : o.id)} title="Comments" style={{ position: 'relative' }}>
                      &#128172; {count > 0 && <span style={{ fontSize: 10, color: 'var(--ink-2)' }}>{count}</span>}
                    </button>
                  </td>
                  <td>{isAdmin && <button className="btn btn-sm btn-ghost" onClick={() => openModal(<OrderFormModal customerId={o.customerId} order={o} />)}>&#8942;</button>}</td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={9} style={{ background: 'var(--surface-2)', padding: '14px 18px' }}>
                      <div style={{ maxWidth: 520 }}>
                        {o.comments.length ? o.comments.map((cm) => (
                          <div key={cm.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{cm.author} <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>&middot; {cm.date}</span></div>
                            <div style={{ fontSize: '12.5px', color: 'var(--ink)', marginTop: 2 }}>{cm.text}</div>
                          </div>
                        )) : <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>No comments yet on this order.</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <input
                            placeholder="Add a comment..."
                            value={commentDrafts[o.id] || ''}
                            onChange={(e) => setCommentDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(o.id); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: 7, fontSize: '12.5px', fontFamily: 'var(--font)' }}
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => handlePostComment(o.id)}>Post</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
