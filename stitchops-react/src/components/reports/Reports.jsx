import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersInRange, rangeLengthDays, shiftRange, growthPct, commissionAmt, convertToDefault } from '../../lib/helpers';
import {SYMIcon, SYM, TODAY } from '../../lib/constants';
import { CalendarIcon } from '../icons/Icon';

const ORDER_CURRENCIES = Object.keys(SYM).filter((cc) => cc !== 'PKR');

function fmtRate(v) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Reports() {
  const { orders, invoices, currencyRates, company, getCustomer, togglePaymentStatus } = useAppState();
  const { toast } = useUi();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('day');
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);

  const defaultCcy = company?.defaultCurrency || 'PKR';

  function setPeriodRange(p) {
    setPeriod(p);
    const ref = new Date(TODAY);
    let f; let t;
    if (p === 'day') { f = t = ref.toISOString().slice(0, 10); } else if (p === 'month') {
      f = new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString().slice(0, 10);
      t = ref.toISOString().slice(0, 10);
    } else {
      f = new Date(ref.getFullYear(), 0, 1).toISOString().slice(0, 10);
      t = ref.toISOString().slice(0, 10);
    }
    setFrom(f); setTo(t);
  }

  const curr = ordersInRange(orders, from, to);
  const days = rangeLengthDays(from, to);
  const [pFrom, pTo] = shiftRange(from, to, days);
  const prev = ordersInRange(orders, pFrom, pTo);

  const totalsByCcy = {}; curr.forEach((o) => { totalsByCcy[o.currency] = (totalsByCcy[o.currency] || 0) + o.price; });
  const prevTotalsByCcy = {}; prev.forEach((o) => { prevTotalsByCcy[o.currency] = (prevTotalsByCcy[o.currency] || 0) + o.price; });
  const countByCcy = {}; curr.forEach((o) => { countByCcy[o.currency] = (countByCcy[o.currency] || 0) + 1; });

  const byDesigner = {};
  curr.forEach((o) => {
    if (!byDesigner[o.designer]) byDesigner[o.designer] = {};
    const cc = o.productionCostCurrency || o.currency;
    byDesigner[o.designer][cc] = (byDesigner[o.designer][cc] || 0) + o.productionCost;
  });

  const bySales = {};
  curr.forEach((o) => {
    const c = getCustomer(o.customerId);
    if (!c) return;
    if (!bySales[c.salesperson]) bySales[c.salesperson] = { count: 0, commission: {} };
    bySales[c.salesperson].count++;
    bySales[c.salesperson].commission[o.currency] = (bySales[c.salesperson].commission[o.currency] || 0) + commissionAmt(o);
  });

  function convertedTotal(byCcy) {
    let total = 0;
    let hasUnknown = false;
    Object.entries(byCcy).forEach(([cc, v]) => {
      const converted = convertToDefault(v, cc, currencyRates, defaultCcy);
      if (converted == null) hasUnknown = true;
      else total += converted;
    });
    return hasUnknown ? null : total;
  }

  async function handleToggle(id) {
    try {
      const next = await togglePaymentStatus(id);
      toast('Payment marked as ' + next + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Reports</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Reports</div>
          <div className="elg-page-sub">Track orders, revenue, and production costs for your selected period.</div>
        </div>
      </div>

      <div className="elg-panel elg-filterbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`elg-btn ${period === 'day' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('day')}>Today</button>
          <button className={`elg-btn ${period === 'month' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('month')}>This Month</button>
          <button className={`elg-btn ${period === 'year' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('year')}>This Year</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriod(''); }} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
            <img src="/images/calender.png" style={{right : "12px"}} alt="" />
          </span>
          <span style={{ color: 'var(--elg-ink-3)', fontSize: 13 }}>to</span>
          <span className="elg-input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriod(''); }} style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} />
                        <img src="/images/calender.png" style={{right : "12px"}} alt="" />
          </span>
        </div>
      </div>

      <div className="elg-metric-grid">
        {ORDER_CURRENCIES.map((cc) => {
          const total = totalsByCcy[cc] || 0;
          const g = growthPct(total, prevTotalsByCcy[cc] || 0);
          return (
            <div className="elg-metric-card" key={cc}>
              <div className="elg-metric-head">
                <span className="elg-metric-label">Total {cc}</span>
                <span className="elg-metric-icon" ><img src={SYMIcon[cc]}/></span>
              </div>
              <div className="elg-metric-value">{SYM[cc]} {fmtRate(total)}</div>
              <div className="elg-metric-sub">{countByCcy[cc] || 0} orders &middot; <span style={{ color: g >= 0 ? 'var(--elg-primary)' : 'var(--elg-red-ink)' }}>{g >= 0 ? '+' : ''}{g}%</span> than last date</div>
            </div>
          );
        })}
      </div>

      <div className="elg-panel elg-table-wrap" style={{ marginBottom: 8 }}>
        <div >
          <div className="elg-section-title" style={{ marginBottom: 18 }}>Production Cost by Designer</div>
        </div>
        <table className="elg-table">
          <thead><tr><th>Designer</th><th>Total Production Cost</th></tr></thead>
          <tbody>
            {Object.keys(byDesigner).length === 0 && <tr><td colSpan={2} className="elg-empty">No orders in this range.</td></tr>}
            {Object.entries(byDesigner).map(([d, byCcy]) => {
              const total = convertedTotal(byCcy);
              return (
                <tr key={d}>
                  <td>{d}</td>
                  <td>{total == null ? '—' : fmt(total, defaultCcy)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        <div style={{marginBottom: 16,lineHeight : "21px", fontSize: 14, color: '#5C5C5C', borderTop: '1px solid var(--elg-line)' }}>
          All totals are converted and displayed in the selected default currency.
        </div>

      <div className="elg-panel elg-table-wrap" style={{ marginBottom: 16 }}>
        <div>
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Salesperson Invoice/Commission Summary</div>
        </div>
        <table className="elg-table">
          <thead><tr><th>Salesperson</th><th>Orders</th><th>Commission Earned</th><th>Commission in {defaultCcy}</th></tr></thead>
          <tbody>
            {Object.keys(bySales).length === 0 && <tr><td colSpan={4} className="elg-empty">No orders in this range.</td></tr>}
            {Object.entries(bySales).map(([name, d]) => {
              const total = convertedTotal(d.commission);
              return (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{d.count}</td>
                  <td>{Object.entries(d.commission).map(([cc, v]) => fmt(v, cc)).join(' + ')}</td>
                  <td>{total == null ? '—' : fmt(total, defaultCcy)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="elg-panel elg-table-wrap">
        <div>
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Client Payment Status</div>
        </div>
        <table className="elg-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Currency</th><th>Amount</th><th>Payment Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={6} className="elg-empty">No approved invoices yet.</td></tr>}
            {invoices.map((i) => {
              const c = getCustomer(i.customerId);
              const paid = i.paymentStatus === 'Completed';
              return (
                <tr key={i.id}>
                  <td>{i.invoiceNo}</td>
                  <td>{c ? c.company : '—'}</td>
                  <td>{i.currency} {SYM[i.currency]}</td>
                  <td>{i.total.toFixed(2)}</td>
                  <td><span className={`elg-badge ${paid ? 'elg-badge-paid' : 'elg-badge-unpaid'}`}>{paid ? 'Paid' : 'Unpaid'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="elg-btn elg-btn-sm" style={{marginLeft : "auto", width: 'auto' }} onClick={() => handleToggle(i.id)}>
                      Mark as {paid ? 'Unpaid' : 'Paid'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
