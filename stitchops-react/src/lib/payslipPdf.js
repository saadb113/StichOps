import { fmt, coveredMonthLabel, commissionAmt, convertToDefault } from './helpers';
import { renderTemplateToPdf } from './htmlToPdf';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function splitAddress(address) {
  if (!address) return [];
  const idx = address.indexOf(', ');
  if (idx === -1) return [address];
  return [address.slice(0, idx + 1), address.slice(idx + 2)];
}

export async function downloadPayslipPdf({ slip, employee, company, orders = [], currencyRates = [], getCustomer }) {
  await renderTemplateToPdf({
    templatePath: '/pdf-templates/payslip.html',
    rootSelector: '.payslip-doc',
    filename: `${slip.slipNo}.pdf`,
    populate: (root) => {
      const set = (field, value) => {
        const el = root.querySelector(`[data-field="${field}"]`);
        if (el) el.textContent = value ?? '';
      };

      set('doc-no', `# ${slip.slipNo}`);
      set('period', coveredMonthLabel(slip.approvedDate));

      const addrEl = root.querySelector('[data-field="company-address"]');
      if (addrEl) {
        addrEl.innerHTML = splitAddress(company?.address).map((l) => `<div>${escapeHtml(l)}</div>`).join('');
      }

      // No Address field here — that's invoice-only.
      set('paid-name', employee?.name);
      set('paid-company', employee?.role);
      set('paid-email', employee?.email);

      const isSales = employee?.role === 'Salesperson';
      const byCust = {};
      orders.forEach((o) => {
        if (!byCust[o.customerId]) byCust[o.customerId] = [];
        byCust[o.customerId].push(o);
      });

      const rows = [`<tr><td>Base Salary</td><td class="align-right">${escapeHtml(fmt(slip.baseSalary, slip.currency))}</td></tr>`];
      Object.entries(byCust).forEach(([custId, cOrders]) => {
        const cust = getCustomer ? getCustomer(Number(custId)) : null;
        let sum = 0;
        cOrders.forEach((o) => {
          const amt = isSales ? commissionAmt(o) : o.productionCost;
          const cc = isSales ? o.currency : (o.productionCostCurrency || o.currency);
          sum += convertToDefault(amt, cc, currencyRates, slip.currency) ?? 0;
        });
        const label = `${isSales ? 'Commission' : 'Production'} — ${cust ? cust.company : 'Unknown'} (${cOrders.length} order${cOrders.length === 1 ? '' : 's'})`;
        rows.push(`<tr><td>${escapeHtml(label)}</td><td class="align-right">${escapeHtml(fmt(sum, slip.currency))}</td></tr>`);
      });
      (slip.bonuses || []).forEach((b) => {
        rows.push(`<tr><td>${escapeHtml(b.label || 'Bonus')}</td><td class="align-right">${escapeHtml(fmt(b.amount, slip.currency))}</td></tr>`);
      });

      const tbody = root.querySelector('[data-field="salary-rows"]');
      if (tbody) tbody.innerHTML = rows.join('');
      set('total', fmt(slip.total, slip.currency));

      set('footer-email', company?.email);
      set('footer-contact', company?.contact);
    }
  });
}
