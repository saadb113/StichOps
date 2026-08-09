import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';

export default function EarningsTab({ employee: e, orders: os }) {
  const { getCustomer, toggleCustomerEarningsPaid } = useAppState();
  const { openModal, toast } = useUi();

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

  return (
    <>
      <div className="elg-panel elg-table-wrap">
        <table className="elg-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Orders</th>
              <th>{e.role === 'Salesperson' ? 'Total Commission' : 'Total Production Cost'}</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCust).map(([custId, cOrders]) => {
              const cust = getCustomer(Number(custId));
              const totals = {};
              let allPaid = true;
              cOrders.forEach((o) => {
                const amt = e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost;
                totals[o.currency] = (totals[o.currency] || 0) + amt;
                const paid = e.role === 'Salesperson' ? o.commissionPaid : o.productionPaid;
                if (!paid) allPaid = false;
              });
              const totalStr = Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ');
              return (
                <tr key={custId}>
                  <td><span>{cust?.company || 'Unknown Customer'}</span></td>
                  <td>{cOrders.length} order{cOrders.length === 1 ? '' : 's'}</td>
                  <td><span>{totalStr}</span></td>
                  <td>
                    <span className={`elg-pill ${allPaid ? 'elg-pill-approved' : 'elg-pill-review'}`}>
                      {allPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="elg-btn elg-btn-ghost elg-btn-sm"
                      style={{ width: 'auto', display: 'inline-flex', marginRight: 6 }}
                      onClick={() => handleToggle(custId)}
                    >
                      Mark as {allPaid ? 'unpaid' : 'paid'}
                    </button>
                    <button
                      className="elg-btn elg-btn-sm"
                      style={{ width: 'auto', display: 'inline-flex' }}
                      onClick={() => openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />, { variant: 'elegant' })}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="elg-panel-foot">
        Grouped by customer — click on <span>edit icon</span> to adjust individual orders. Changes here also update the Reports commission summary
      </div>
    </>
  );
}
