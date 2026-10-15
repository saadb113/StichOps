import { useEffect, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { api } from '../../lib/api';
import { fmt, commissionAmt, convertToDefault } from '../../lib/helpers';
import { TODAY } from '../../lib/constants';

const monthLabel = (key) => new Date(key + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Month-by-month profit & loss: revenue from the month's orders, minus
// production cost, sales commission and any other expenses entered here.
// Everything is shown in the company default currency.
export default function MonthlyReport() {
  const { orders, invoices, currencyRates, company, getCustomer } = useAppState();
  const { toast } = useUi();
  const defaultCcy = company?.defaultCurrency || 'PKR';

  const currentMonth = TODAY.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/expenses?month=${month}`).then((rows) => { if (!cancelled) setExpenses(rows); }).catch(() => { if (!cancelled) setExpenses([]); });
    return () => { cancelled = true; };
  }, [month]);

  const monthKeys = new Set([currentMonth]);
  orders.forEach((o) => monthKeys.add(o.date.slice(0, 7)));
  invoices.forEach((i) => monthKeys.add(i.generatedDate.slice(0, 7)));
  const months = [...monthKeys].sort().reverse();

  let unknownRate = false;
  const toDefault = (amt, ccy) => {
    const v = convertToDefault(amt, ccy, currencyRates || [], defaultCcy);
    if (v == null) { unknownRate = true; return 0; }
    return v;
  };

  const monthOrders = orders.filter((o) => o.date.startsWith(month) && o.status !== 'Cancelled');
  let revenue = 0; let production = 0; let commission = 0;
  monthOrders.forEach((o) => {
    revenue += toDefault(o.price, o.currency);
    production += toDefault(o.productionCost, o.productionCostCurrency || o.currency);
    const c = getCustomer(o.customerId);
    if (c && c.salesperson) commission += toDefault(commissionAmt(o), o.currency);
  });
  const otherExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = revenue - production - commission - otherExpenses;

  const monthInvoices = invoices.filter((i) => i.status === 'approved' && i.generatedDate.startsWith(month));
  let received = 0; let pending = 0;
  monthInvoices.forEach((i) => {
    const v = toDefault(i.total, i.currency);
    if (i.paymentStatus === 'Completed') received += v; else pending += v;
  });

  async function addExpense() {
    try {
      const created = await api.post('/expenses', { month, label, amount: Number(amount) });
      setExpenses((list) => [...list, created]);
      setLabel(''); setAmount('');
    } catch (e) {
      toast(e.message);
    }
  }
  async function removeExpense(id) {
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses((list) => list.filter((e) => e.id !== id));
    } catch (e) {
      toast(e.message);
    }
  }

  const row = (name, value, opts = {}) => (
    <tr style={opts.strong ? { fontWeight: 600 } : undefined}>
      <td>{name}</td>
      <td style={{ textAlign: 'right', color: opts.negative ? 'var(--elg-red-ink)' : undefined }}>{opts.negative ? '- ' : ''}{fmt(value, defaultCcy)}</td>
    </tr>
  );

  return (
    <div className="elg-panel" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="elg-section-title">Monthly Profit &amp; Loss</div>
        <select className="elg-select" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
        </select>
      </div>

      <div className="elg-table-wrap">
        <table className="elg-table">
          <thead><tr><th>{monthLabel(month)}</th><th style={{ textAlign: 'right' }}>Amount ({defaultCcy})</th></tr></thead>
          <tbody>
            {row('Revenue', revenue)}
            {row('Production Cost', production, { negative: true })}
            {row('Sales Commission', commission, { negative: true })}
            {row('Other Expenses', otherExpenses, { negative: true })}
            {row('Net Profit', netProfit, { strong: true })}
          </tbody>
        </table>
      </div>
      {unknownRate && <div style={{ fontSize: 13, color: 'var(--elg-red-ink)', marginTop: 8 }}>Some currencies have no exchange rate set, so their amounts are counted as 0. Add the rate in Settings.</div>}

      <div className="elg-metric-grid" style={{ marginTop: 16 }}>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Orders this month</span></div>
          <div className="elg-metric-value">{monthOrders.length}</div>
          <div className="elg-metric-sub">Excluding cancelled</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Invoice payments received</span></div>
          <div className="elg-metric-value">{fmt(received, defaultCcy)}</div>
          <div className="elg-metric-sub">{monthInvoices.filter((i) => i.paymentStatus === 'Completed').length} paid invoice(s)</div>
        </div>
        <div className="elg-metric-card">
          <div className="elg-metric-head"><span className="elg-metric-label">Invoice payments pending</span></div>
          <div className="elg-metric-value">{fmt(pending, defaultCcy)}</div>
          <div className="elg-metric-sub">{monthInvoices.filter((i) => i.paymentStatus !== 'Completed').length} unpaid invoice(s)</div>
        </div>
      </div>

      <div className="elg-section-title" style={{ margin: '20px 0 10px' }}>Other expenses for {monthLabel(month)}</div>
      {expenses.length === 0 && <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', marginBottom: 10 }}>No other expenses added for this month.</div>}
      {expenses.map((e) => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 14, borderBottom: '1px solid var(--elg-line)' }}>
          <span>{e.label}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            {fmt(e.amount, defaultCcy)}
            <button className="elg-icon-sq" title="Remove" onClick={() => removeExpense(e.id)} style={{ border: 0, background: 'none' }}><img src="/images/cancel-x-mark.svg" alt="" width="14" height="14" /></button>
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <input className="elg-input" style={{ flex: '1 1 200px' }} placeholder="Expense (e.g. Rent)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="elg-input" style={{ flex: '0 1 140px' }} type="number" min="0" placeholder={`Amount (${defaultCcy})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="elg-btn" style={{ width: 'auto' }} onClick={addExpense}>Add Expense</button>
      </div>
    </div>
  );
}
