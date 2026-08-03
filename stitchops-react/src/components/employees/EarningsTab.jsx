import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, commissionAmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';

export default function EarningsTab({ employee: e, orders: os }) {
  const { getCustomer, toggleCustomerEarningsPaid } = useAppState();
  const { openModal, toast } = useUi();

  if (!os.length) return <div className="panel"><div className="empty"><i>No completed orders yet</i>Earnings will list here once linked orders are completed.</div></div>;

  const byCust = {};
  os.forEach((o) => { if (!byCust[o.customerId]) byCust[o.customerId] = []; byCust[o.customerId].push(o); });

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
    <div className="panel">
      <table>
        <thead><tr><th>Customer</th><th>Orders</th><th>{e.role === 'Salesperson' ? 'Total commission' : 'Total production cost'}</th><th>Status</th><th></th></tr></thead>
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
                <td>{cust.company}</td>
                <td>{cOrders.length}</td>
                <td>{totalStr}</td>
                <td><span className={`badge ${allPaid ? 'b-approved' : 'b-review'}`}>{allPaid ? 'Paid' : 'Unpaid'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm" onClick={() => handleToggle(custId)}>Mark as {allPaid ? 'unpaid' : 'paid'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />)}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '10px 18px', fontSize: '11.5px', color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>Grouped by customer — click Edit to adjust individual orders. Changes here also update the Reports commission summary.</div>
    </div>
  );
}
