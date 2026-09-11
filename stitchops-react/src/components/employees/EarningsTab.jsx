import { Fragment, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt, convertToDefault, sumConvertedToDefault } from '../../lib/helpers';
import { ChevronDownIcon } from '../icons/Icon';
import EditSlipOrdersModal from './EditSlipOrdersModal';

export default function EarningsTab({ employee: e, orders: os }) {
  const { getCustomer, company, currencyRates, toggleCustomerEarningsPaid } = useAppState();
  const { openModal, toast } = useUi();
  const defaultCurrency = company?.defaultCurrency || 'PKR';
  const [expandedId, setExpandedId] = useState(null);

  if (!os.length) {
    return (
      <div className="elg-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No completed orders yet</div>
        <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Earnings will be listed here once linked orders are completed.</div>
      </div>
    );
  }

  const byCust = {};
  os.forEach((o) => {
    if (!byCust[o.customerId]) byCust[o.customerId] = [];
    byCust[o.customerId].push(o);
  });

  async function handleToggle(custId) {
    try {
      await toggleCustomerEarningsPaid(e.id, custId);
      const cust = getCustomer(Number(custId));
      toast('Status updated for ' + (cust?.company || 'customer') + '.');
    } catch (err) {
      toast(err.message);
    }
  }

  function orderAmount(o) {
    if (e.role === 'Salesperson') return { amt: commissionAmt(o), cc: o.currency };
    return { amt: o.productionCost, cc: o.productionCostCurrency || o.currency };
  }

  return (
    <>
      <div className="elg-panel employeeList">
        <div className="elg-mobile-cards">
          {Object.entries(byCust).map(([custId, cOrders]) => {
            const cust = getCustomer(Number(custId));
            const totals = {};
            cOrders.forEach((o) => {
              const { amt, cc } = orderAmount(o);
              totals[cc] = (totals[cc] || 0) + amt;
            });
            const converted = sumConvertedToDefault(totals, currencyRates, defaultCurrency);
            const totalStr = converted == null ? '—' : fmt(converted, defaultCurrency);
            const earnedStr = Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ');
            const expanded = expandedId === custId;
            return (
              <div key={custId} className="elg-mobile-card">
                <div className="elg-mobile-card-head clickable" onClick={() => setExpandedId(expanded ? null : custId)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ChevronDownIcon width={13} height={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', color: 'var(--elg-ink-3)', flexShrink: 0 }} />
                    <span className="elg-mobile-card-title">{cust?.company || 'Unknown Customer'}</span>
                  </span>
                  <button
                    className="elg-icon-sq"
                    onClick={(ev) => { ev.stopPropagation(); openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />, { variant: 'elegant' }); }}
                    title="Edit"
                  >
                    <img src="/icons/pencil-icon.svg" alt="" />
                  </button>
                </div>
                <div className="elg-mobile-card-row">{cOrders.length} order{cOrders.length === 1 ? '' : 's'}</div>
                <div className="elg-mobile-card-foot">
                  <span className="elg-mobile-card-row" style={{ marginBottom: 0 }}>{earnedStr}</span>
                  <span className="elg-mobile-card-price">{totalStr}</span>
                </div>
                {expanded && cOrders.map((o) => {
                  const { amt, cc } = orderAmount(o);
                  const orderConverted = convertToDefault(amt, cc, currencyRates, defaultCurrency);
                  return (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0 22px', borderTop: '1px solid var(--elg-line)', marginTop: 8, color: 'var(--elg-ink-3)', fontSize: 13 }}>
                      <span>{o.name}</span>
                      <span>{fmt(amt, cc)} · {orderConverted == null ? '—' : fmt(orderConverted, defaultCurrency)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="elg-table-wrap">
        <table className="elg-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Orders</th>
              <th>{e.role === 'Salesperson' ? 'Commission Earned' : 'Production Cost'}</th>
              <th>{e.role === 'Salesperson' ? 'Commission in ' + defaultCurrency : 'Production Cost in ' + defaultCurrency}</th>
              <th style={{minWidth : "150px"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCust).map(([custId, cOrders]) => {
              const cust = getCustomer(Number(custId));
              const totals = {};
              let allPaid = true;
              cOrders.forEach((o) => {
                const { amt, cc } = orderAmount(o);
                totals[cc] = (totals[cc] || 0) + amt;
                const paid = e.role === 'Salesperson' ? o.commissionPaid : o.productionPaid;
                if (!paid) allPaid = false;
              });
              const converted = sumConvertedToDefault(totals, currencyRates, defaultCurrency);
              const totalStr = converted == null ? '—' : fmt(converted, defaultCurrency);
              const earnedStr = Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ');
              const expanded = expandedId === custId;
              return (
                <Fragment key={custId}>
                  <tr className="clickable" onClick={() => setExpandedId(expanded ? null : custId)}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ChevronDownIcon width={13} height={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', color: 'var(--elg-ink-3)', flexShrink: 0 }} />
                        {cust?.company || 'Unknown Customer'}
                      </span>
                    </td>
                    <td>{cOrders.length} order{cOrders.length === 1 ? '' : 's'}</td>
                    <td>{earnedStr}</td>
                    <td><span>{totalStr}</span></td>

                    <td>

                      <button
                        className="elg-btn elg-btn-sm earnings-action-btn"
                        onClick={(ev) => { ev.stopPropagation(); openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />, { variant: 'elegant' }); }}
                      >
                        <img src="/icons/pencil-icon.svg" alt="" />
                      </button>
                    </td>
                  </tr>
                  {expanded && cOrders.map((o) => {
                    const { amt, cc } = orderAmount(o);
                    const orderConverted = convertToDefault(amt, cc, currencyRates, defaultCurrency);
                    return (
                      <tr key={o.id} className="elg-earnings-order-row">
                        <td colSpan={2} style={{ paddingLeft: 34, color: 'var(--elg-ink-3)' }}>{o.name}</td>
                        <td>{fmt(amt, cc)}</td>
                        <td>{orderConverted == null ? '—' : fmt(orderConverted, defaultCurrency)}</td>
                        <td></td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      <div className="elg-panel-foot">
        Grouped by customer — click a row to see individual orders, or the <span>edit icon</span> to adjust them. Changes here also update the Reports commission summary
      </div>
    </>
  );
}
