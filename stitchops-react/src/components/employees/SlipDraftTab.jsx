import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, nth, commissionAmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';
import { CheckIcon } from '../icons/Icon';

export default function SlipDraftTab({ employee: e, unpaidReady, onApproved }) {
  const { company, getCustomer, approveSlip } = useAppState();
  const { openModal, toast } = useUi();

  const variableTotal = unpaidReady.reduce((s, o) => s + (e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost), 0);
  const grandTotal = e.baseSalary + variableTotal;
  const byCust = {};
  unpaidReady.forEach((o) => {
    if (!byCust[o.customerId]) byCust[o.customerId] = [];
    byCust[o.customerId].push(o);
  });

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
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="elg-pill elg-pill-review" style={{ fontSize: 12, padding: '2px 8px', lineHeight : "21px", borderRadius : "8px" }}>
          Pending review &middot; draft, not yet finalized
        </span>
      </div>

      <div className="elg-panel" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--elg-line)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--elg-font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--elg-ink)' }}>
              {company.name}
            </div>
            <div style={{ fontSize: 13, color: '#5C5C5C', marginTop: 2 }}>{company.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 300, fontFamily : "var(--elg-font-serif)" }}>Draft Salary Slip</div>
            <div style={{ fontSize: 14, color: '#5C5C5C', marginTop: 2 }}>Pay to: {e.name}</div>
            <div style={{ fontSize: 14, color: '#5C5C5C' }}>Payout day: {e.payoutDay}{nth(e.payoutDay)}</div>
          </div>
        </div>

        <div className="elg-table-wrap">
          <table className="elg-table">
            <thead>
              <tr>
                <th>Order</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Base Salary</strong></td>
                <td style={{ textAlign: 'right' }}>{fmt(e.baseSalary, e.currency)}</td>
              </tr>
              {Object.entries(byCust).map(([custId, cOrders]) => {
                const cust = getCustomer(Number(custId));
                const sum = cOrders.reduce((s, o) => s + (e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost), 0);
                const ccy = cOrders[0].currency;
                return (
                  <tr key={custId}>
                    <td>
                      <span>{e.role === 'Salesperson' ? 'Commission' : 'Production'} — <strong>{cust ? cust.company : 'Unknown'}</strong> ({cOrders.length} order{cOrders.length === 1 ? '' : 's'})</span>{' '}
                      <button
                        className="elg-btn elg-btn-ghost elg-btn-sm"
                        style={{ display: 'inline-flex', padding: '2px 6px', fontSize: 11, color: 'var(--elg-primary)' }}
                        onClick={(ev) => {
                          ev.preventDefault();
                          openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />, { variant: 'elegant' });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum, ccy)}</td>
                  </tr>
                );
              })}
              <tr style={{  fontWeight: 500 }}>
                <td style={{ fontSize: 14, color: 'var(--elg-ink)' }}>Total</td>
                <td style={{ textAlign: 'right', fontSize: 16 }}>{fmt(grandTotal, e.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="elg-btn elg-btn-primary"
          style={{ width: 'auto', display: 'inline-flex' }}
          onClick={handleApprove}
        >
          <CheckIcon /> Approve Slip
        </button>
      </div>
    </>
  );
}
