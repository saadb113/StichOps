import { Fragment, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { fmt, ordersForEmployee, commissionAmt } from '../../lib/helpers';

function EarningsIcon({ active }) {
  const c = active ? '#fff' : '#737373';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.98993 6.8032C2.16966 6.58371 2.25953 6.47397 2.34685 6.50525C2.43416 6.53652 2.4339 6.68877 2.43338 6.99328C2.43337 6.99713 2.43337 7.00099 2.43337 7.00484C2.43337 10.6286 5.37103 13.5663 8.99483 13.5663C8.99869 13.5663 9.00254 13.5663 9.0064 13.5663C9.3109 13.5658 9.46316 13.5655 9.49443 13.6528C9.5257 13.7401 9.41596 13.83 9.19648 14.0097C8.31347 14.7328 7.18448 15.1667 5.95415 15.1667C3.12582 15.1667 0.833008 12.8739 0.833008 10.0455C0.833008 8.8152 1.26687 7.68621 1.98993 6.8032Z" fill={c} />
      <path d="M3.5 6.66634C3.5 3.44468 6.11167 0.833008 9.33333 0.833008C12.555 0.833008 15.1667 3.44468 15.1667 6.66634C15.1667 9.888 12.555 12.4997 9.33333 12.4997C6.11167 12.4997 3.5 9.888 3.5 6.66634Z" fill={c} />
    </svg>
  );
}

function HistoryIcon({ active }) {
  const c = active ? '#fff' : '#737373';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12.6344 5.73739L14.3078 5.63551C13.1083 2.46952 9.66434 0.666284 6.30661 1.56284C2.73033 2.51775 0.606095 6.17372 1.56199 9.72869C2.51788 13.2837 6.19193 15.3914 9.76821 14.4365C12.4235 13.7275 14.2784 11.5294 14.6663 8.98926" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5.33301V7.99967L9.33333 9.33301" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrentEarningsPanel({ emp, os }) {
  const { getCustomer } = useAppState();
  const unpaidReady = os.filter((o) => !o.commissionPaid);
  const unpaidTotalCombined = unpaidReady.reduce((s, o) => s + commissionAmt(o), 0);

  const byCust = {};
  os.forEach((o) => { if (!byCust[o.customerId]) byCust[o.customerId] = []; byCust[o.customerId].push(o); });

  return (
    <>
      <div className="elg-panel elg-table-wrap" style={{ marginBottom: 20 }}>
        <table className="elg-table">
          <thead><tr><th>Customer</th><th>Orders</th><th>Invoice Total</th><th>Commission</th></tr></thead>
          <tbody>
            {Object.keys(byCust).length === 0 && <tr><td colSpan={4} className="elg-empty">No completed orders in this view.</td></tr>}
            {Object.entries(byCust).map(([custId, cOrders]) => {
              const cust = getCustomer(Number(custId));
              const totals = {}; const commTotals = {}; let rate = cOrders[0]?.commissionRate;
              cOrders.forEach((o) => { totals[o.currency] = (totals[o.currency] || 0) + o.price; commTotals[o.currency] = (commTotals[o.currency] || 0) + commissionAmt(o); });
              return (
                <tr key={custId}>
                  <td>{cust ? cust.company : '—'}</td>
                  <td>{cOrders.length}</td>
                  <td>{Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
                  <td>{Object.entries(commTotals).map(([cc, v]) => fmt(v, cc)).join(' + ')} <span className="elg-comm-pct">({rate}%)</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="elg-panel">
        <div style={{ padding: '18px 0 0' }}>
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Next Slip Preview</div>
        </div>
        <table className="elg-table">
          <thead><tr><th>Order</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            <tr><td>Base Salary</td><td style={{ textAlign: 'right' }}>{fmt(emp.baseSalary, emp.currency)}</td></tr>
            <tr><td>Total Commission</td><td style={{ textAlign: 'right' }}>{fmt(unpaidTotalCombined, emp.currency)}</td></tr>
            <tr><td style={{ fontWeight: 700, color: 'var(--elg-ink)' }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(emp.baseSalary + unpaidTotalCombined, emp.currency)}</td></tr>
          </tbody>
        </table>
        <div style={{ padding: '14px 20px', fontSize: 12.5, color: 'var(--elg-ink-3)' }}>
          Your admin approves and generates the official slip on your payout day.
        </div>
      </div>
    </>
  );
}

function SlipHistoryPanel({ emp }) {
  const { payslips } = useAppState();
  const [openSlipId, setOpenSlipId] = useState(null);
  const slips = payslips.filter((s) => s.employeeId === emp.id).sort((a, b) => b.id - a.id);

  if (!slips.length) {
    return (
      <div className="elg-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No slips yet</div>
        <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Your approved salary slips will appear here.</div>
      </div>
    );
  }

  return (
    <div className="elg-panel elg-table-wrap">
      <table className="elg-table">
        <thead><tr><th>Slip</th><th>Date</th><th>Total</th></tr></thead>
        <tbody>
          {slips.map((s) => {
            const open = openSlipId === s.id;
            return (
              <Fragment key={s.id}>
                <tr className="clickable" onClick={() => setOpenSlipId(open ? null : s.id)}>
                  <td>{s.slipNo}</td>
                  <td>{s.approvedDate}</td>
                  <td>{fmt(s.total, s.currency)}</td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={3} style={{ padding: 0 }}>
                      <div style={{ padding: '12px 16px 16px', borderRadius : "8px ",border: "1px solid #E8E8E8" }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <strong style={{ fontFamily: 'var(--elg-font-serif)', fontSize: 14, color: 'var(--elg-ink)' }}>{s.slipNo}</strong>
                          <span style={{ fontSize: 12.5, color: 'var(--elg-ink-3)' }}>Approved on {s.approvedDate}</span>
                        </div>
                        <div className="elg-kv" style={{paddingTop : 10}}>
                          <div className="elg-kv-row"><span className="k">Base Salary</span><span className="v">{fmt(s.baseSalary || 0, s.currency)}</span></div>
                          <div className="elg-kv-row"><span className="k">Total Commission</span><span className="v">{fmt(s.commission != null ? s.commission : (s.total - (s.baseSalary || 0)), s.currency)}</span></div>
                          <div className="elg-kv-row"><span className="k" style={{ fontWeight: 500, color: 'var(--elg-ink)', fontSize : 14 }}>Total</span><span className="v" style={{ fontWeight: 700 }}>{fmt(s.total, s.currency)}</span></div>
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

export default function MyPayslip() {
  const { currentEmployee: emp, orders, customers } = useAppState();
  const [tab, setTab] = useState('earnings');

  const os = ordersForEmployee(orders, customers, emp).filter((o) => o.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="elg-page">
      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Payslip</div>
          <div className="elg-page-sub">Your commission and salary history</div>
        </div>
      </div>

      <div className="elg-tabs" style={{ marginBottom: 18 }}>
        <div className={`elg-tab ${tab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>
          <EarningsIcon active={tab === 'earnings'} /> Current Earnings
        </div>
        <div className={`elg-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <HistoryIcon active={tab === 'history'} /> Slip History
        </div>
      </div>

      {tab === 'earnings' ? <CurrentEarningsPanel emp={emp} os={os} /> : <SlipHistoryPanel emp={emp} />}
    </div>
  );
}
