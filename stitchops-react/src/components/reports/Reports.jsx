import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, ordersInRange, rangeLengthDays, shiftRange, growthPct, commissionAmt, convertToDefault } from '../../lib/helpers';
import { SYMIcon, SYM, TODAY } from '../../lib/constants';
import { CalendarIcon, BagIcon, CoinIcon, DocIcon, ClockIcon, WarningIcon, DownloadIcon } from '../icons/Icon';
import ConfirmMarkPaidModal from '../invoices/ConfirmMarkPaidModal';
import RangeDateField from '../common/RangeDateField';
import MonthlyReport, { useNetProfit } from './MonthlyReport';
import { Sk, SkText, SkeletonMetricCards, SkeletonRows, SkeletonMobileCards } from '../common/Skeleton';

const REPORT_CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR'];

function fmtRate(v) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumByCcy(list) {
  return list.reduce((acc, byCcy) => {
    Object.entries(byCcy).forEach(([cc, v]) => { acc[cc] = (acc[cc] || 0) + v; });
    return acc;
  }, {});
}

export default function Reports() {
  const { dataLoading, orders, invoices, payslips, currencyRates, company, getCustomer, getEmployee } = useAppState();
  const { openModal, toast } = useUi();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const [period, setPeriod] = useState('day');
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [exporting, setExporting] = useState(false);
  const np = useNetProfit();

  const defaultCcy = company?.defaultCurrency || 'PKR';

  function setPeriodRange(p) {
    setPeriod(p);
    // Plain string math — building local-midnight Dates and calling
    // toISOString() shifts the day back in UTC+ timezones (e.g. PKT).
    const f = p === 'day' ? TODAY : p === 'month' ? `${TODAY.slice(0, 7)}-01` : `${TODAY.slice(0, 4)}-01-01`;
    setFrom(f); setTo(TODAY);
  }

  // Clearing the date field leaves from/to empty — shiftRange would then
  // build an Invalid Date and crash on .toISOString(), so fall back to
  // "everything, no previous-period comparison" instead of a date-bound range.
  const hasRange = Boolean(from && to);
  const inRange = (d) => !hasRange || (d >= from && d <= to);
  const curr = hasRange ? ordersInRange(orders, from, to) : orders.slice();
  const days = hasRange ? rangeLengthDays(from, to) : 0;
  const [pFrom, pTo] = hasRange ? shiftRange(from, to, days) : ['', ''];
  const prev = hasRange ? ordersInRange(orders, pFrom, pTo) : [];

  const totalsByCcy = {}; curr.forEach((o) => { totalsByCcy[o.currency] = (totalsByCcy[o.currency] || 0) + o.price; });
  const prevTotalsByCcy = {}; prev.forEach((o) => { prevTotalsByCcy[o.currency] = (prevTotalsByCcy[o.currency] || 0) + o.price; });
  const countByCcy = {}; curr.forEach((o) => { countByCcy[o.currency] = (countByCcy[o.currency] || 0) + 1; });

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
  const money = (v) => (v == null ? '—' : fmt(v, defaultCcy));

  const byDesigner = {};
  curr.forEach((o) => {
    if (!byDesigner[o.designer]) byDesigner[o.designer] = { count: 0, cost: {} };
    byDesigner[o.designer].count++;
    const cc = o.productionCostCurrency || o.currency;
    byDesigner[o.designer].cost[cc] = (byDesigner[o.designer].cost[cc] || 0) + o.productionCost;
  });
  const designerRows = Object.entries(byDesigner).map(([name, d]) => ({ name, count: d.count, total: convertedTotal(d.cost) }));
  const designerTotal = {
    count: designerRows.reduce((s, r) => s + r.count, 0),
    total: convertedTotal(sumByCcy(Object.values(byDesigner).map((d) => d.cost)))
  };

  const bySales = {};
  curr.forEach((o) => {
    const c = getCustomer(o.customerId);
    if (!c) return;
    // Company-owned customers have no assigned salesperson — bucket their
    // orders separately instead of under a literal "null" label.
    const salesKey = c.salesperson || 'Unassigned (Company)';
    if (!bySales[salesKey]) bySales[salesKey] = { count: 0, commission: {} };
    bySales[salesKey].count++;
    bySales[salesKey].commission[o.currency] = (bySales[salesKey].commission[o.currency] || 0) + commissionAmt(o);
  });
  const salesRows = Object.entries(bySales).map(([name, d]) => ({
    name,
    count: d.count,
    earned: Object.entries(d.commission).map(([cc, v]) => fmt(v, cc)).join(' + '),
    total: convertedTotal(d.commission)
  }));
  const salesTotal = {
    count: salesRows.reduce((s, r) => s + r.count, 0),
    total: convertedTotal(sumByCcy(Object.values(bySales).map((d) => d.commission)))
  };

  // Deductions are stored as negative PayslipBonus rows; payslips are always
  // in the default currency, so no conversion is needed.
  const bonusByEmployee = {};
  const deductionByEmployee = {};
  payslips.filter((p) => inRange(p.approvedDate)).forEach((p) => {
    const name = getEmployee(p.employeeId)?.name || `#${p.employeeId}`;
    (p.bonuses || []).forEach((b) => {
      if (b.amount > 0) bonusByEmployee[name] = (bonusByEmployee[name] || 0) + b.amount;
      else if (b.amount < 0) deductionByEmployee[name] = (deductionByEmployee[name] || 0) + Math.abs(b.amount);
    });
  });
  const bonusRows = Object.entries(bonusByEmployee).map(([name, amount]) => ({ name, amount }));
  const deductionRows = Object.entries(deductionByEmployee).map(([name, amount]) => ({ name, amount }));
  const bonusTotal = bonusRows.reduce((s, r) => s + r.amount, 0);
  const deductionTotal = deductionRows.reduce((s, r) => s + r.amount, 0);

  const approvedInvoices = invoices.filter((i) => i.status === 'approved' && inRange(i.generatedDate));
  const paidInvoices = approvedInvoices.filter((i) => i.paymentStatus === 'Completed');
  const unpaidInvoices = approvedInvoices.filter((i) => i.paymentStatus !== 'Completed');
  const invoiceByCcy = (list) => list.reduce((acc, i) => { acc[i.currency] = (acc[i.currency] || 0) + i.total; return acc; }, {});
  const outstandingByCcy = invoiceByCcy(unpaidInvoices);
  const paymentReceivedTotal = convertedTotal(invoiceByCcy(paidInvoices));
  const outstandingPaymentTotal = convertedTotal(outstandingByCcy);

  function handleMarkPaid(inv) {
    const c = getCustomer(inv.customerId);
    openModal(<ConfirmMarkPaidModal invoice={inv} customerName={c?.company} />, { variant: 'elegant' });
  }

  const rangeLabel = hasRange ? `${from} to ${to}` : 'All time';
  const fileStem = `ElegantsDesign_report_${hasRange ? `${from}_${to}` : 'all_time'}`;

  async function handleDownload() {
    if (!pageRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true, ignoreElements: (el) => el.dataset?.noExport === 'true' });
      const pdf = new jsPDF({ unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${fileStem}.pdf`);
    } catch (e) {
      toast(`Couldn't create the PDF: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  function handleExportXlsx() {
    const n = (v) => (v == null ? '' : Math.round(v * 100) / 100);
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);

    add('Summary', [
      ['Period', rangeLabel],
      [],
      ['Currency', 'Total', 'Orders'],
      ...REPORT_CURRENCIES.map((cc) => [cc, n(totalsByCcy[cc] || 0), countByCcy[cc] || 0])
    ]);
    add('Production Cost', [
      ['Designer', 'Total Orders', `Production Cost (${defaultCcy})`],
      ...designerRows.map((r) => [r.name, r.count, n(r.total)]),
      ['Total', designerTotal.count, n(designerTotal.total)]
    ]);
    add('Commission', [
      ['Salesperson', 'Orders', 'Commission Earned', `Commission in ${defaultCcy}`],
      ...salesRows.map((r) => [r.name, r.count, r.earned, n(r.total)]),
      ['Total', salesTotal.count, '', n(salesTotal.total)]
    ]);
    add('Bonus & Deduction', [
      ['Employee', `Bonus (${defaultCcy})`],
      ...bonusRows.map((r) => [r.name, n(r.amount)]),
      ['Total', n(bonusTotal)],
      [],
      ['Employee', `Deduction (${defaultCcy})`],
      ...deductionRows.map((r) => [r.name, n(r.amount)]),
      ['Total', n(deductionTotal)]
    ]);
    add('Invoices', [
      ['Total Invoices', approvedInvoices.length],
      ['Outstanding', unpaidInvoices.length],
      [`Payment Received (${defaultCcy})`, n(paymentReceivedTotal)],
      [`Outstanding Payment (${defaultCcy})`, n(outstandingPaymentTotal)],
      [],
      ['Outstanding by currency'],
      REPORT_CURRENCIES,
      REPORT_CURRENCIES.map((cc) => n(outstandingByCcy[cc] || 0)),
      [],
      ['ID', 'Customer', 'Currency', 'Amount', 'Payment Status'],
      ...unpaidInvoices.map((i) => [i.invoiceNo, getCustomer(i.customerId)?.company || '', i.currency, n(i.total), 'Unpaid'])
    ]);
    add('Net Profit', [
      ['Period', np.periodLabel],
      ['Particular', `Amount (${defaultCcy})`],
      ['Total Income', n(np.rows.income)],
      ['Salaries', n(np.rows.salaries)],
      ['Production Cost', n(np.rows.production)],
      ['Sales Commission', n(np.rows.commission)],
      ['Other Expenses', n(np.rows.otherExpenses)],
      ['Total', n(np.rows.total)]
    ]);
    XLSX.writeFile(wb, `${fileStem}.xlsx`);
  }

  const emptyRow = (cols, text) => <tr><td colSpan={cols} className="elg-empty">{text}</td></tr>;
  const totalRowStyle = { fontWeight: 600 };

  return (
    <div className="elg-page" ref={pageRef}>
      <div className="elg-crumbs" data-no-export="true">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Reports</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Reports</div>
          <div className="elg-page-sub">Track orders, revenue, and production costs for your selected period.</div>
        </div>
        <div className="elg-report-group-actions" data-no-export="true">
          <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleDownload} disabled={exporting}>
            <img src="/images/download-invoice.svg"/> {exporting ? 'Preparing…' : 'Download'}
          </button>
          <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleExportXlsx}>
            <img width="17" height="17" alt="" src="/icons/report-icon.svg"/> Export XLSX
          </button>
        </div>
      </div>

      {/* ---------- Period block ---------- */}
      <div className="elg-report-group">
        <div className="elg-report-group-head elg-reports-filterbar">
          <div className="elg-report-group-actions elg-report-period-btns" data-no-export="true">
            <button className={`elg-btn ${period === 'day' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('day')}>Today</button>
            <button className={`elg-btn ${period === 'month' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('month')}>This Month</button>
            <button className={`elg-btn ${period === 'year' ? 'elg-btn-primary' : ''}`} style={{ width: 'auto' }} onClick={() => setPeriodRange('year')}>This Year</button>
          </div>
          <RangeDateField from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); setPeriod(''); }} align="right" />
        </div>

        <div className="elg-metric-grid">
          {dataLoading ? (<SkeletonMetricCards labels={REPORT_CURRENCIES.map((cc) => `Total ${cc}`)} subs={[2, 2, 2, 2]} />) : (<>
          {REPORT_CURRENCIES.map((cc) => {
            const total = totalsByCcy[cc] || 0;
            const g = growthPct(total, prevTotalsByCcy[cc] || 0);
            return (
              <div className={`elg-metric-card elg-ccy-${cc}`} key={cc}>
                <div className="elg-metric-head">
                  <span className="elg-metric-label">Total {cc}</span>
                  <span className="elg-metric-icon"><img src={SYMIcon[cc]} alt="" /></span>
                </div>
                <div className="elg-metric-value">{SYM[cc]} {fmtRate(total)}</div>
                <div className="elg-metric-sub">{countByCcy[cc] || 0} orders &middot; <span style={{ color: g >= 0 ? 'var(--elg-primary)' : 'var(--elg-red-ink)' }}>{g >= 0 ? '+' : ''}{g}%</span> than last date</div>
              </div>
            );
          })}
          </>)}
        </div>

        <div className="elg-panel elg-report-flat">
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Production Cost by Designer</div>
          <div className="elg-mobile-cards">
            {dataLoading ? (<SkeletonMobileCards count={2} right="price" foot={null} />) : (<>
            {designerRows.length === 0 && <div className="elg-empty">No orders in this range.</div>}
            {designerRows.map((r) => (
              <div key={r.name} className="elg-mobile-card">
                <div className="elg-mobile-card-head">
                  <div className="elg-mobile-card-title">{r.name}</div>
                  <div className="elg-mobile-card-price">{money(r.total)}</div>
                </div>
                <div className="elg-mobile-card-row"><img alt="" src="/images/todays-order.svg"/>{r.count}</div>
              </div>
            ))}
            {designerRows.length > 0 && (
              <div className="elg-mobile-card elg-report-line">
                <span>Total</span><span>{money(designerTotal.total)}</span>
              </div>
            )}
            </>)}
          </div>
          <div className="elg-table-wrap">
            <table className="elg-table">
              <thead><tr><th>Designer</th><th>Total Orders</th><th>Production Cost</th></tr></thead>
              <tbody>
                {dataLoading ? (<SkeletonRows cols={3} rows={3} />) : (<>
                {designerRows.length === 0 && emptyRow(3, 'No orders in this range.')}
                {designerRows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td><td>{money(r.total)}</td></tr>)}
                {designerRows.length > 0 && <tr style={totalRowStyle}><td>Total</td><td>{designerTotal.count}</td><td>{money(designerTotal.total)}</td></tr>}
                </>)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="elg-report-note">All totals are converted and displayed in the selected default currency.</div>

        <div className="elg-panel elg-report-flat">
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Salesperson Commission Summary</div>
          <div className="elg-mobile-cards">
            {dataLoading ? (<SkeletonMobileCards count={2} right="price" rows={2} foot={null} />) : (<>
            {salesRows.length === 0 && <div className="elg-empty">No orders in this range.</div>}
            {salesRows.map((r) => (
              <div key={r.name} className="elg-mobile-card">
                <div className="elg-mobile-card-head">
                  <div className="elg-mobile-card-title">{r.name}</div>
                  <div className="elg-mobile-card-price">{money(r.total)}</div>
                </div>
                <div className="elg-mobile-card-row"><img alt="" src="/images/todays-order.svg"/>{r.count}</div>
                <div className="elg-mobile-card-row"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9.33333 11.9997C12.2789 11.9997 14.6667 9.61186 14.6667 6.66634C14.6667 3.72082 12.2789 1.33301 9.33333 1.33301C6.38781 1.33301 4 3.72082 4 6.66634C4 9.61186 6.38781 11.9997 9.33333 11.9997Z" stroke="#737373" stroke-width="1.2" stroke-linecap="round"></path><path d="M8.77764 13.9789C8.04171 14.4156 7.18247 14.6663 6.26467 14.6663C3.54099 14.6663 1.33301 12.4583 1.33301 9.73464C1.33301 8.81685 1.58372 7.95761 2.02039 7.22168" stroke="#737373" stroke-width="1.2" stroke-linecap="round"></path></svg>{r.earned}</div>
              </div>
            ))}
            {salesRows.length > 0 && (
              <div className="elg-mobile-card elg-report-line">
                <span>Total</span><span>{money(salesTotal.total)}</span>
              </div>
            )}
            </>)}
          </div>
          <div className="elg-table-wrap">
            <table className="elg-table">
              <thead><tr><th>Salesperson</th><th>Orders</th><th>Commission Earned</th><th>Commission in {defaultCcy}</th></tr></thead>
              <tbody>
                {dataLoading ? (<SkeletonRows cols={4} rows={3} />) : (<>
                {salesRows.length === 0 && emptyRow(4, 'No orders in this range.')}
                {salesRows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td><td>{r.earned}</td><td>{money(r.total)}</td></tr>)}
                {salesRows.length > 0 && <tr style={totalRowStyle}><td>Total</td><td>{salesTotal.count}</td><td /><td>{money(salesTotal.total)}</td></tr>}
                </>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="elg-bonus-deduction-grid">
          {[
            { title: "Employee's Bonus", rows: bonusRows, total: bonusTotal, empty: 'No bonuses in this range.' },
            { title: "Employee's Deduction", rows: deductionRows, total: deductionTotal, empty: 'No deductions in this range.' }
          ].map((s) => (
            <div className="elg-panel elg-report-flat" style={{ margin: 0 }} key={s.title}>
              <div className="elg-section-title" style={{ marginBottom: 14 }}>{s.title}</div>
              <div className="elg-mobile-cards">
                {dataLoading ? ([0, 1].map((k) => <div className="elg-mobile-card elg-report-line" key={k} aria-busy="true"><SkText w="45%" /><SkText w={80} style={{ justifyContent: 'flex-end' }} /></div>)) : (<>
                {s.rows.length === 0 && <div className="elg-empty">{s.empty}</div>}
                {s.rows.map((r) => (
                  <div key={r.name} className="elg-mobile-card elg-report-line"><span>{r.name}</span><span>{fmt(r.amount, defaultCcy)}</span></div>
                ))}
                {s.rows.length > 0 && <div className="elg-mobile-card elg-report-line"><span>Total</span><span>{fmt(s.total, defaultCcy)}</span></div>}
                </>)}
              </div>
              <div className="elg-table-wrap">
                <table className="elg-table">
                  <thead><tr><th>Employee</th><th>Amount</th></tr></thead>
                  <tbody>
                    {dataLoading ? (<SkeletonRows cols={2} rows={3} />) : (<>
                    {s.rows.length === 0 && emptyRow(2, s.empty)}
                    {s.rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{fmt(r.amount, defaultCcy)}</td></tr>)}
                    {s.rows.length > 0 && <tr style={totalRowStyle}><td>Total</td><td>{fmt(s.total, defaultCcy)}</td></tr>}
                    </>)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Invoices block ---------- */}
      <div className="elg-report-group">
        <div className="elg-section-title">Invoices</div>
        <div className="elg-metric-grid">
          {dataLoading ? (<SkeletonMetricCards labels={['Total Invoices', 'Outstanding', <><span className="elg-desktop-only">Payment Received</span><span className="elg-mobile-only">Payment Rec.</span></>, <><span className="elg-desktop-only">Outstanding Payment</span><span className="elg-mobile-only">Outstanding Pay.</span></>]} />) : (<>
          <div className="elg-metric-card">
            <div className="elg-metric-head"><span className="elg-metric-label">Total Invoices</span><span className="elg-metric-icon"><img alt="" src="/images/todays-invoice.svg"/></span></div>
            <div className="elg-metric-value">{approvedInvoices.length}</div>
            <div className="elg-metric-sub">Across all currencies</div>
          </div>
          <div className="elg-metric-card">
            <div className="elg-metric-head"><span className="elg-metric-label">Outstanding</span><span className="elg-metric-icon"><img alt="" src="/images/unpaid-invoices.svg"/></span></div>
            <div className="elg-metric-value">{unpaidInvoices.length}</div>
            <div className="elg-metric-sub">Across all currencies</div>
          </div>
          <div className="elg-metric-card">
            <div className="elg-metric-head"><span className="elg-metric-label"><span className="elg-desktop-only">Payment Received</span><span className="elg-mobile-only">Payment Rec.</span></span><span className="elg-metric-icon"><img alt="" src="/images/payment-received-icon.svg"/></span></div>
            <div className="elg-metric-value">{money(paymentReceivedTotal)}</div>
            <div className="elg-metric-sub">From Paid Invoices ({paidInvoices.length})</div>
          </div>
          <div className="elg-metric-card">
            <div className="elg-metric-head"><span className="elg-metric-label"><span className="elg-desktop-only">Outstanding Payment</span><span className="elg-mobile-only">Outstanding Pay.</span></span><span className="elg-metric-icon"><img alt="" src="/images/outstanding-payment-icon.svg"/></span></div>
            <div className="elg-metric-value">{money(outstandingPaymentTotal)}</div>
            <div className="elg-metric-sub">From Unpaid Invoices ({unpaidInvoices.length})</div>
          </div>
          </>)}
        </div>

        <div className="elg-panel">
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Outstanding Invoices</div>
          <div className="elg-mobile-cards elg-outstanding-mobile">
            {REPORT_CURRENCIES.map((cc) => (
              <div key={cc} className="elg-report-row"><span>{cc} {SYM[cc]}</span><span>{dataLoading ? <Sk w={50} h={12} /> : fmtRate(outstandingByCcy[cc] || 0)}</span></div>
            ))}
          </div>
          <div className="elg-table-wrap">
            <table className="elg-table">
              <thead><tr>{REPORT_CURRENCIES.map((cc) => <th key={cc}>{cc} {SYM[cc]}</th>)}</tr></thead>
              <tbody><tr>{REPORT_CURRENCIES.map((cc) => <td key={cc}>{dataLoading ? <SkText w={50} /> : fmtRate(outstandingByCcy[cc] || 0)}</td>)}</tr></tbody>
            </table>
          </div>
        </div>

        <div className="elg-panel elg-report-flat">
          <div className="elg-section-title" style={{ marginBottom: 14 }}>Client Payment Status</div>
          <div className="elg-mobile-cards">
            {dataLoading ? (<SkeletonMobileCards count={2} right="price" subtitle foot="badge-price" />) : (<>
            {unpaidInvoices.length === 0 && <div className="elg-empty">No unpaid invoices — everything's settled.</div>}
            {unpaidInvoices.map((i) => {
              const c = getCustomer(i.customerId);
              return (
                <div key={i.id} className="elg-mobile-card">
                  <div className="elg-mobile-card-head">
                    <div className="elg-mobile-card-title">{c ? c.company : '—'}</div>
                    <div className="elg-mobile-card-price">{i.currency} {fmtRate(i.total)}</div>
                  </div>
                  <div className="elg-mobile-card-subtitle" style={{ marginBottom: 6 }}>{i.invoiceNo}</div>
                  <div className="elg-mobile-card-row"><img alt="" src="/images/calender.svg" />{i.generatedDate}</div>
                  <div className="elg-mobile-card-foot">
                    <span className="elg-badge elg-badge-unpaid">Unpaid</span>
                    <button className="elg-btn elg-btn-sm" style={{ width: 'auto' }} onClick={() => handleMarkPaid(i)}>Mark as Paid</button>
                  </div>
                </div>
              );
            })}
            </>)}
          </div>
          <div className="elg-table-wrap">
            <table className="elg-table">
              <thead><tr><th>ID</th><th>Customer</th><th>Currency</th><th>Amount</th><th>Payment Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>
                {dataLoading ? (<SkeletonRows cols={6} rows={3} />) : (<>
                {unpaidInvoices.length === 0 && emptyRow(6, "No unpaid invoices — everything's settled.")}
                {unpaidInvoices.map((i) => {
                  const c = getCustomer(i.customerId);
                  return (
                    <tr key={i.id}>
                      <td>{i.invoiceNo}</td>
                      <td>{c ? c.company : '—'}</td>
                      <td>{i.currency} {SYM[i.currency]}</td>
                      <td>{fmtRate(i.total)}</td>
                      <td><span className="elg-badge elg-badge-unpaid">Unpaid</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="elg-btn elg-btn-sm" style={{ marginLeft: 'auto', width: 'auto' }} onClick={() => handleMarkPaid(i)} data-no-export="true">Mark as Paid</button>
                      </td>
                    </tr>
                  );
                })}
                </>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------- Total Revenue block ---------- */}
      <MonthlyReport np={np} />
    </div>
  );
}
