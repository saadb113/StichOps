import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, nth, commissionAmt, convertToDefault, guessSlipPrefix, formatSlipNo } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';
import EmployeeFormModal from './EmployeeFormModal';

let bonusIdSeq = 0;
function newBonus() {
  bonusIdSeq += 1;
  return { id: bonusIdSeq, label: '', amount: '' };
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// A slip is only approvable once its calendar month has actually closed —
// this mirrors the "on or before the end of last month" bucket the backend
// uses (lib/period.js), so what's shown here always matches what Approve
// would actually submit.
function computePeriods() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const prevPeriodEndDate = new Date(Date.UTC(y, m, 0));
  const prevPeriodStartDate = new Date(Date.UTC(y, m - 1, 1));
  return {
    prevPeriodEnd: toDateStr(prevPeriodEndDate),
    prevPeriodStart: toDateStr(prevPeriodStartDate),
    prevMonthLabel: prevPeriodStartDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
    currMonthLabel: now.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  };
}

function SlipPeriodCard({ e, orders, slipNo, periodLabel, canApprove, badgeText, onApproved }) {
  const { company, currencyRates, getCustomer, approveSlip } = useAppState();
  const { openModal, toast } = useUi();
  const [editMode, setEditMode] = useState(false);
  // savedBonuses is what's shown outside edit mode and what Approve submits.
  // draftBonuses is the live-editable copy while editMode is on — Cancel
  // throws it away, Save Changes promotes it to savedBonuses.
  const [savedBonuses, setSavedBonuses] = useState([]);
  const [draftBonuses, setDraftBonuses] = useState([]);
  const defaultCurrency = company?.defaultCurrency || 'PKR';

  const bonuses = editMode ? draftBonuses : savedBonuses;

  let variableTotal = 0;
  let hasUnknownRate = false;
  orders.forEach((o) => {
    const amt = e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost;
    const cc = e.role === 'Salesperson' ? o.currency : (o.productionCostCurrency || o.currency);
    const converted = convertToDefault(amt, cc, currencyRates, defaultCurrency);
    if (converted == null) hasUnknownRate = true;
    else variableTotal += converted;
  });
  const bonusTotal = bonuses.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const grandTotal = e.baseSalary + variableTotal + bonusTotal;
  const byCust = {};
  orders.forEach((o) => {
    if (!byCust[o.customerId]) byCust[o.customerId] = [];
    byCust[o.customerId].push(o);
  });

  function addBonusRow() {
    setDraftBonuses((list) => [...list, newBonus()]);
  }
  function updateBonusRow(id, field, value) {
    setDraftBonuses((list) => list.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }
  function removeBonusRow(id) {
    setDraftBonuses((list) => list.filter((b) => b.id !== id));
  }

  function handleEditSlip() {
    setDraftBonuses(savedBonuses.map((b) => ({ ...b })));
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setDraftBonuses([]);
  }

  function handleSaveChanges() {
    setSavedBonuses(draftBonuses.filter((b) => Number(b.amount) > 0));
    setEditMode(false);
  }

  async function handleApprove() {
    try {
      const payload = savedBonuses
        .filter((b) => Number(b.amount) > 0)
        .map((b) => ({ label: b.label, amount: Number(b.amount) }));
      const slip = await approveSlip(e.id, payload);
      toast(slip.slipNo + ' approved for ' + e.name + '. Download is now available.');
      setSavedBonuses([]);
      if (onApproved) onApproved();
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="elg-pill elg-pill-review" style={{ fontSize: 14, padding: '2px 8px', lineHeight: "21px", borderRadius: "8px" }}>
          {badgeText}
        </span>
      </div>

      <div className="elg-panel elg-salary-slip" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',  marginBottom: 20 }}>
          <div>
            <img src="/images/elegant-design-icon.png" width="34" height="36" style={{ marginBottom: '8px' }} />
            <div className="meta">{company.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 300, fontFamily: "var(--elg-font-serif)" }}>Draft salary slip</div>
            <div style={{ fontSize: 13, lineHeight: "20px", color: '#5C5C5C', marginTop: 2 }}># {slipNo}</div>
            <div style={{ fontSize: 13, lineHeight: "20px", color: '#5C5C5C' }}>{periodLabel}</div>
          </div>
        </div>

        <div className="elg-table-wrap">
          <table className="elg-table">
            <thead>
              <tr>
                <th>{canApprove ? 'Salary' : 'Orders'}</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                {editMode && <th></th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Base Salary</strong></td>
                <td style={{ textAlign: 'right' }}>{fmt(e.baseSalary, defaultCurrency)}</td>
                {editMode && (
                  <td className="elg-edit-btn">
                    <button
                      className="elg-icon-sq"
                      title="Edit"
                      onClick={(ev) => {
                        ev.preventDefault();
                        openModal(<EmployeeFormModal employee={e} />, { variant: 'elegant' });
                      }}
                    >
                      <img src="/images/edit.svg" alt="Edit Icon" width={14} height={14} />
                    </button>
                  </td>
                )}
              </tr>
              {Object.entries(byCust).map(([custId, cOrders]) => {
                const cust = getCustomer(Number(custId));
                let sum = 0;
                let unknown = false;
                cOrders.forEach((o) => {
                  const amt = e.role === 'Salesperson' ? commissionAmt(o) : o.productionCost;
                  const cc = e.role === 'Salesperson' ? o.currency : (o.productionCostCurrency || o.currency);
                  const converted = convertToDefault(amt, cc, currencyRates, defaultCurrency);
                  if (converted == null) unknown = true;
                  else sum += converted;
                });
                return (
                  <tr key={custId}>
                    <td>
                      <span>{e.role === 'Salesperson' ? 'Commission' : 'Production'} — <strong>{cust ? cust.company : 'Unknown'}</strong> ({cOrders.length} order{cOrders.length === 1 ? '' : 's'})</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{unknown ? '—' : fmt(sum, defaultCurrency)}</td>
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
              {canApprove && bonuses.map((b) => (
                <tr key={b.id}>
                  <td>
                    {editMode ? (
                      <input
                        className="elg-input"
                        style={{ width: '100%', borderRadius: 4 }}
                        value={b.label}
                        onChange={(ev) => updateBonusRow(b.id, 'label', ev.target.value)}
                        placeholder="Add Bonus"
                      />
                    ) : (b.label || 'Bonus')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <input
                          className="elg-input"
                          style={{ width: 120, textAlign: 'right', borderRadius: 4 }}
                          type="number"
                          min="0"
                          value={b.amount}
                          onChange={(ev) => updateBonusRow(b.id, 'amount', ev.target.value)}
                          placeholder="Add Amount"
                        />
                      </div>
                    ) : fmt(Number(b.amount) || 0, defaultCurrency)}
                  </td>
                  {editMode && (
                    <td className="elg-edit-btn">
                      <button className="elg-icon-sq" title="Remove bonus" onClick={() => removeBonusRow(b.id)}><img alt="" width="14px" height="14px" src="/images/cancel-x-mark.svg"/></button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="elg-invoice-total-row" style={{ fontWeight: 500 }}>
                <td>Total</td>
                <td style={{ textAlign: 'right' }}>{hasUnknownRate ? '—' : fmt(grandTotal, defaultCurrency)}</td>
                {editMode && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div >

      <div className='salaryslipsButtons' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        {editMode && canApprove ? (
          <button
            className="elg-btn"
            style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={addBonusRow}
          >
            + Add Bonus
          </button>
        ) : <span />}
        <div style={{ display: 'flex', gap: 10 }}>
          {editMode ? (
            <>
              <button className="elg-btn" style={{ width: 'auto' }} onClick={handleCancelEdit}>Cancel</button>
              <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSaveChanges}>Save Changes</button>
            </>
          ) : (
            <>
              <button
                className="elg-btn"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={handleEditSlip}
              >
                <img src="/icons/pencil-icon.svg" alt="" /> Edit Slip
              </button>
              {canApprove && (
                <button
                  className="elg-btn elg-btn-primary"
                  style={{ width: 'auto', display: 'inline-flex' }}
                  onClick={handleApprove}
                >
                   Approve Slip
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function SlipDraftTab({ employee: e, unpaidReady, onApproved }) {
  const { prevPeriodEnd, prevPeriodStart, prevMonthLabel, currMonthLabel } = computePeriods();

  const previousOrders = unpaidReady.filter((o) => o.date <= prevPeriodEnd);
  const currentOrders = unpaidReady.filter((o) => o.date > prevPeriodEnd);

  const alreadyApprovedPrevious = e.lastSlipApprovedPeriod && e.lastSlipApprovedPeriod >= prevPeriodStart;
  const showPrevious = !alreadyApprovedPrevious;

  const prefix = e.slipPrefix || guessSlipPrefix(e.name);
  const previousSeq = e.nextSlipSeq;
  const currentSeq = showPrevious ? e.nextSlipSeq + 1 : e.nextSlipSeq;

  return (
    <>
      {showPrevious && (
        <SlipPeriodCard
          e={e}
          orders={previousOrders}
          slipNo={formatSlipNo(prefix, previousSeq)}
          periodLabel={`Month of ${prevMonthLabel}`}
          canApprove
          badgeText="Pending review · draft, not yet finalized"
          onApproved={onApproved}
        />
      )}
      <SlipPeriodCard
        e={e}
        orders={currentOrders}
        slipNo={formatSlipNo(prefix, currentSeq)}
        periodLabel={`Month of ${currMonthLabel}`}
        canApprove={false}
        badgeText="In Progress"
      />
    </>
  );
}
