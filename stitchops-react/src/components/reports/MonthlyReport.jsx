import { useEffect, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { api } from '../../lib/api';
import { fmt, commissionAmt, convertToDefault } from '../../lib/helpers';
import { TODAY } from '../../lib/constants';
import { CloseIcon, PlusIcon } from '../icons/Icon';
import { SkText } from '../common/Skeleton';

const monthName = (key) => new Date(key + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
const monthLabel = (key) => new Date(key + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function ExpenseModal({ month, expenses, defaultCcy, onAdded, onRemoved }) {
  const { closeModal, toast } = useUi();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [list, setList] = useState(expenses);

  async function add() {
    try {
      const created = await api.post('/expenses', { month, label, amount: Number(amount) });
      setList((l) => [...l, created]);
      onAdded(created);
      setLabel(''); setAmount('');
      toast('Expense added.');
    } catch (e) {
      toast(e.message);
    }
  }
  async function remove(id) {
    try {
      await api.delete(`/expenses/${id}`);
      setList((l) => l.filter((e) => e.id !== id));
      onRemoved(id);
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal">
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--elg-ink)' }}>Expenses — {monthLabel(month)}</div>
        <button className="elg-btn elg-btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>
      <div className="elg-modal-body" style={{ padding: 24 }}>
        {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', marginBottom: 12 }}>No other expenses added for this month.</div>}
        {list.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 14, borderBottom: '1px solid var(--elg-line)' }}>
            <span>{e.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              {fmt(e.amount, defaultCcy)}
              <button className="elg-icon-sq" title="Remove" onClick={() => remove(e.id)} style={{ border: 0, background: 'none' }}><img src="/images/cancel-x-mark.svg" alt="" width="14" height="14" /></button>
            </span>
          </div>
        ))}
        <div className="elg-field-row" style={{ marginTop: 16 }}>
          <div className="elg-field">
            <label>Expense</label>
            <input placeholder="e.g. Rent" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="elg-field">
            <label>Amount ({defaultCcy})</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>Close</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={add}>Add Expense</button>
      </div>
    </div>
  );
}

// Total Revenue / Net Profit for a month or a whole year, in the company
// default currency. Salaries count only payslip base salary — commission and
// production cost come from the orders themselves so they aren't double-counted.
export function useNetProfit() {
  const { dataLoading, orders, payslips, currencyRates, company, getCustomer } = useAppState();
  const defaultCcy = company?.defaultCurrency || 'PKR';
  const currentMonth = TODAY.slice(0, 7);
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(TODAY.slice(0, 4));
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/expenses').then((rows) => { if (!cancelled) setExpenses(rows); }).catch(() => { if (!cancelled) setExpenses([]); }).finally(() => { if (!cancelled) setExpensesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const prefix = mode === 'month' ? month : year;
  let unknownRate = false;
  const toDefault = (amt, ccy) => {
    const v = convertToDefault(amt, ccy, currencyRates || [], defaultCcy);
    if (v == null) { unknownRate = true; return 0; }
    return v;
  };

  let income = 0; let production = 0; let commission = 0;
  orders.filter((o) => o.date.startsWith(prefix) && o.status !== 'Cancelled').forEach((o) => {
    income += toDefault(o.price, o.currency);
    production += toDefault(o.productionCost, o.productionCostCurrency || o.currency);
    const c = getCustomer(o.customerId);
    if (c && c.salesperson) commission += toDefault(commissionAmt(o), o.currency);
  });
  const salaries = payslips.filter((p) => p.approvedDate.startsWith(prefix)).reduce((s, p) => s + toDefault(p.baseSalary, p.currency), 0);
  const periodExpenses = expenses.filter((e) => e.month.startsWith(prefix));
  const otherExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const total = income - salaries - production - commission - otherExpenses;

  const monthKeys = new Set([currentMonth]);
  orders.forEach((o) => monthKeys.add(o.date.slice(0, 7)));
  expenses.forEach((e) => monthKeys.add(e.month));
  const months = [...monthKeys].filter((k) => k.startsWith(year)).sort().reverse();
  const years = [...new Set([...monthKeys].map((k) => k.slice(0, 4)))].sort().reverse();

  return {
    loading: dataLoading || expensesLoading,
    defaultCcy, mode, setMode, month, setMonth, year, setYear, months, years,
    expenses, setExpenses, periodExpenses, unknownRate,
    rows: { income, salaries, production, commission, otherExpenses, total },
    periodLabel: mode === 'month' ? monthLabel(month) : year
  };
}

export default function MonthlyReport({ np }) {
  const { openModal } = useUi();
  const { loading, defaultCcy, mode, setMode, month, setMonth, year, setYear, months, years, expenses, setExpenses, unknownRate, rows } = np;

  function openExpenses() {
    const target = mode === 'month' ? month : TODAY.slice(0, 7);
    openModal(
      <ExpenseModal
        month={target}
        defaultCcy={defaultCcy}
        expenses={expenses.filter((e) => e.month === target)}
        onAdded={(e) => setExpenses((l) => [...l, e])}
        onRemoved={(id) => setExpenses((l) => l.filter((x) => x.id !== id))}
      />,
      { variant: 'elegant' }
    );
  }

  const line = (name, value, strong) => (
    <tr style={strong ? { fontWeight: 600 } : undefined}>
      <td>{name}</td>
      <td>{loading ? <SkText w={90} /> : fmt(value, defaultCcy)}</td>
    </tr>
  );

  return (
    <div className="elg-report-group">
      <div className="elg-report-group-head">
        <div className="elg-section-title">Total Revenue</div>
        <div className="elg-report-group-actions elg-revenue-actions">
          <button className={`elg-btn elg-desktop-only ${mode === 'month' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => { setMode('month'); setYear(month.slice(0, 4)); }}>This Month</button>
          <button className={`elg-btn elg-desktop-only ${mode === 'year' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setMode('year')}>This Year</button>
          {mode === 'month' ? (
            <select className="elg-select" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((k) => <option key={k} value={k}>{monthName(k)}</option>)}
            </select>
          ) : (
            <select className="elg-select" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="elg-panel" style={{ margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div className="elg-section-title">Net Profit</div>
          <button className="elg-btn elg-btn-sm" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--elg-primary)' }} onClick={openExpenses}>
            <PlusIcon width={14} height={14} /> Add Expense
          </button>
        </div>
        <div className="elg-table-wrap">
          <table className="elg-table">
            <thead><tr><th>Particular</th><th>Amount</th></tr></thead>
            <tbody>
              {line('Total Income', rows.income)}
              {line('Salaries', rows.salaries)}
              {line('Production Cost', rows.production)}
              {line('Sales Commission', rows.commission)}
              {line('Other Expenses', rows.otherExpenses)}
              {line('Total', rows.total, true)}
            </tbody>
          </table>
        </div>
        {unknownRate && <div style={{ fontSize: 13, color: 'var(--elg-red-ink)', marginTop: 8 }}>Some currencies have no exchange rate set, so their amounts are counted as 0. Add the rate in Settings.</div>}
      </div>
    </div>
  );
}
