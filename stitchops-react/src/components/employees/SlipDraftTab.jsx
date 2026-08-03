import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, nth, commissionAmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';

export default function SlipDraftTab({ employee: e, unpaidReady, onApproved }) {
  const { company, getCustomer, approveSlip } = useAppState();
  const { openModal, toast } = useUi();

  const variableTotal = unpaidReady.reduce((s, o) => s + (e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost), 0);
  const grandTotal = e.baseSalary + variableTotal;
  const byCust = {};
  unpaidReady.forEach((o) => { if (!byCust[o.customerId]) byCust[o.customerId] = []; byCust[o.customerId].push(o); });

  async function handleApprove() {
    try {
      const slip = await approveSlip(e.id);
      toast(slip.slipNo + ' approved for ' + e.name + '. Download is now available.');
      if (onApproved) onApproved();
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <div className="badge b-review" style={{ marginBottom: 12, fontSize: 12, padding: '5px 12px' }}>Pending review &middot; draft, not yet finalized</div>
      <div className="invoice-doc">
        <div className="idr">
          <div><h2>{company.name}</h2><div style={{ color: 'var(--ink-2)' }}>{company.address}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>Draft salary slip</div>
            <div style={{ color: 'var(--ink-2)' }}>Pay to: {e.name}</div>
            <div style={{ color: 'var(--ink-2)' }}>Payout day: {e.payoutDay}{nth(e.payoutDay)}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            <tr><td>Base salary</td><td style={{ textAlign: 'right' }}>{fmt(e.baseSalary, e.currency)}</td></tr>
            {Object.entries(byCust).map(([custId, cOrders]) => {
              const cust = getCustomer(Number(custId));
              const sum = cOrders.reduce((s, o) => s + (e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost), 0);
              const ccy = cOrders[0].currency;
              return (
                <tr key={custId}>
                  <td>
                    {e.role === 'Salesperson' ? 'Commission' : 'Production'} — {cust ? cust.company : 'Unknown'} ({cOrders.length} order{cOrders.length === 1 ? '' : 's'}){' '}
                    <a href="#" onClick={(ev) => { ev.preventDefault(); openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />); }} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Edit</a>
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmt(sum, ccy)}</td>
                </tr>
              );
            })}
            <tr className="invoice-total-row"><td>Total</td><td style={{ textAlign: 'right' }}>{fmt(grandTotal, e.currency)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn btn-primary" onClick={handleApprove}>Approve slip</button>
      </div>
    </>
  );
}
