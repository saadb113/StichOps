import { Fragment, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { fmt, ordersForEmployee, commissionAmt } from '../../lib/helpers';

function EarningsReadonly({ emp, os }) {
  const { getCustomer } = useAppState();
  if (!os.length) return <div className="panel"><div className="empty"><i>No completed orders in this view</i>Try clearing the date filter or switching months.</div></div>;
  const byCust = {};
  os.forEach((o) => { if (!byCust[o.customerId]) byCust[o.customerId] = []; byCust[o.customerId].push(o); });
  return (
    <div className="panel">
      <table>
        <thead><tr><th>Customer</th><th>Orders</th><th>Invoice total</th><th>Your commission</th><th>Status</th></tr></thead>
        <tbody>
          {Object.entries(byCust).map(([custId, cOrders]) => {
            const cust = getCustomer(Number(custId));
            const totals = {}; const commTotals = {};
            let allPaid = true;
            cOrders.forEach((o) => { totals[o.currency] = (totals[o.currency] || 0) + o.price; commTotals[o.currency] = (commTotals[o.currency] || 0) + commissionAmt(o); if (!o.commissionPaid) allPaid = false; });
            return (
              <tr key={custId}>
                <td>{cust.company}</td>
                <td>{cOrders.length}</td>
                <td>{Object.entries(totals).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
                <td>{Object.entries(commTotals).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
                <td><span className={`badge ${allPaid ? 'b-approved' : 'b-review'}`}>{allPaid ? 'Paid' : 'Unpaid'}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SlipHistoryReadonly({ emp }) {
  const { payslips } = useAppState();
  const [openSlipId, setOpenSlipId] = useState(null);
  const slips = payslips.filter((s) => s.employeeId === emp.id).sort((a, b) => b.id - a.id);
  if (!slips.length) return <div className="panel"><div className="empty"><i>No slips yet</i>Your approved salary slips will appear here.</div></div>;

  return (
    <div className="panel">
      <table>
        <thead><tr><th>Slip</th><th>Date</th><th>Total</th></tr></thead>
        <tbody>
          {slips.map((s) => {
            const open = openSlipId === s.id;
            return (
              <Fragment key={s.id}>
                <tr className="clickable" onClick={() => setOpenSlipId(open ? null : s.id)}>
                  <td><strong>{s.slipNo}</strong></td>
                  <td>{s.approvedDate}</td>
                  <td>{fmt(s.total, s.currency)}</td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={3} style={{ background: 'var(--surface-2)', padding: '16px 18px' }}>
                      <div className="panel" style={{ margin: 0 }}>
                        <div className="panel-head"><h3>{s.slipNo}</h3></div>
                        <div style={{ padding: '16px 18px' }}>
                          <div className="kv">
                            <div className="kv-row"><span className="k">Base salary</span><span className="v">{fmt(s.baseSalary || 0, s.currency)}</span></div>
                            <div className="kv-row"><span className="k">Total commission</span><span className="v">{fmt(s.commission != null ? s.commission : (s.total - (s.baseSalary || 0)), s.currency)}</span></div>
                            <div className="kv-row"><span className="k">Total</span><span className="v">{fmt(s.total, s.currency)}</span></div>
                          </div>
                          <div className="hint" style={{ marginTop: 10 }}>Approved on {s.approvedDate}.</div>
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
  const unpaidReady = os.filter((o) => !o.commissionPaid);
  const unpaidTotalCombined = unpaidReady.reduce((s, o) => s + commissionAmt(o), 0);
  const unpaidStr = fmt(unpaidTotalCombined, emp.currency);

  return (
    <>
      <div className="topbar"><div><div className="page-title">My Payslip</div><div className="page-sub">Your commission and salary history</div></div></div>
      <div className="tabs">
        <div className={`tab ${tab !== 'history' ? 'active' : ''}`} onClick={() => setTab('earnings')}>Current earnings</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Slip history</div>
      </div>
      {tab === 'history' ? <SlipHistoryReadonly emp={emp} /> : (
        <>
          <EarningsReadonly emp={emp} os={os} />
          <div className="panel">
            <div className="panel-head"><h3>Next slip preview</h3></div>
            <div style={{ padding: '16px 18px' }}>
              <div className="kv">
                <div className="kv-row"><span className="k">Base salary</span><span className="v">{fmt(emp.baseSalary, emp.currency)}</span></div>
                <div className="kv-row"><span className="k">Total commission</span><span className="v">{unpaidStr}</span></div>
                <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Total</span><span className="v" style={{ fontWeight: 800 }}>{fmt(emp.baseSalary + unpaidTotalCombined, emp.currency)}</span></div>
              </div>
              <div className="hint" style={{ marginTop: 10 }}>Your admin approves and generates the official slip on your payout day.</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
