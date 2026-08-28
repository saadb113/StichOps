import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, nth, commissionAmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';
import { CheckIcon, PencilIcon } from '../icons/Icon';

export default function SlipDraftTab({ employee: e, unpaidReady, onApproved }) {
  const { company, getCustomer, approveSlip } = useAppState();
  const { openModal, toast } = useUi();
  const [editMode, setEditMode] = useState(false);

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
        <span className="elg-pill elg-pill-review" style={{ fontSize: 12, padding: '2px 8px', lineHeight: "21px", borderRadius: "8px" }}>
          Pending review &middot; draft, not yet finalized
        </span>
      </div>

      <div className="elg-panel elg-salary-slip" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--elg-line)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <img src="/images/elegant-design-icon.png" width="34" height="36" style={{ marginBottom: '8px' }} />
            <div className="meta">{company.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 300, fontFamily: "var(--elg-font-serif)" }}>Draft Salary Slip</div>
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
                {editMode && <th></th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Base Salary</strong></td>
                <td style={{ textAlign: 'right' }}>{fmt(e.baseSalary, e.currency)}</td>
                {editMode && <td></td>}
              </tr>
              {Object.entries(byCust).map(([custId, cOrders]) => {
                const cust = getCustomer(Number(custId));
                const sum = cOrders.reduce((s, o) => s + (e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost), 0);
                const ccy = cOrders[0].currency;
                return (
                  <tr key={custId}>
                    <td>
                      <span>{e.role === 'Salesperson' ? 'Commission' : 'Production'} — <strong>{cust ? cust.company : 'Unknown'}</strong> ({cOrders.length} order{cOrders.length === 1 ? '' : 's'})</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum, ccy)}</td>
                    {editMode && (
                      <td className="elg-edit-btn">
                        <button
                          className="elg-icon-sq"
                          title="Edit"
                          onClick={(ev) => {
                            ev.preventDefault();
                            openModal(<EditSlipOrdersModal ctx={{ type: 'earnings', employeeId: e.id, customerId: Number(custId) }} />, { variant: 'elegant' });
                          }}
                        >
                          <img src="/images/edit.svg" alt="Edit Icon" width={14} height={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="elg-invoice-total-row" style={{ fontWeight: 500 }}>
                <td>Total</td>
                <td style={{ textAlign: 'right' }}>{fmt(grandTotal, e.currency)}</td>
                {editMode && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div >

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {editMode ? (
          <>
            <button className="elg-btn" style={{ width: 'auto' }} onClick={() => setEditMode(false)}>Cancel</button>
            <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={() => setEditMode(false)}>Save Changes</button>
          </>
        ) : (
          <>
            <button
              className="elg-btn"
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setEditMode(true)}
            >
              <PencilIcon width={13} height={13} /> Edit Orders
            </button>
            <button
              className="elg-btn elg-btn-primary"
              style={{ width: 'auto', display: 'inline-flex' }}
              onClick={handleApprove}
            >
              <CheckIcon /> Approve Slip
            </button>
          </>
        )}
      </div>
    </>
  );
}
