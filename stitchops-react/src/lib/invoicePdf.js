import { fmt, coveredMonthLabel, bankAccountLines } from './helpers';
import { renderTemplateToPdf } from './htmlToPdf';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "14 Riverside Yard, Manchester, UK" -> ["14 Riverside Yard,", "Manchester, UK"]
function splitAddress(address) {
  if (!address) return [];
  const idx = address.indexOf(', ');
  if (idx === -1) return [address];
  return [address.slice(0, idx + 1), address.slice(idx + 2)];
}

export async function downloadInvoicePdf({ invoice, customer, company, orders, bankAccount }) {
  await renderTemplateToPdf({
    templatePath: '/pdf-templates/invoice.html',
    rootSelector: '.invoice-doc',
    filename: `${invoice.invoiceNo}.pdf`,
    populate: (root) => {
      const set = (field, value) => {
        const el = root.querySelector(`[data-field="${field}"]`);
        if (el) el.textContent = value ?? '';
      };

      const invoiceLabel = invoice.invoiceNo + (invoice.version > 1 ? ` (v${invoice.version})` : '');
      set('doc-no', `# ${invoiceLabel}`);
      set('period', coveredMonthLabel(invoice.generatedDate));

      const addrEl = root.querySelector('[data-field="company-address"]');
      if (addrEl) {
        addrEl.innerHTML = splitAddress(company?.address).map((l) => `<div>${escapeHtml(l)}</div>`).join('');
      }

      set('bill-name', customer?.name);
      set('bill-company', customer?.company);
      set('bill-email', customer?.email);

      // Only the invoice carries an address (the salary slip doesn't) —
      // and it's the customer's full billing address, assembled from their
      // separate address/zip/country fields into one line.
      const address = [customer?.address, customer?.zip, customer?.country].filter(Boolean).join(', ');
      const addrRow = root.querySelector('[data-field="bill-address-row"]');
      if (address) {
        set('bill-address', address);
      } else if (addrRow) {
        addrRow.style.display = 'none';
      }

      const tbody = root.querySelector('[data-field="order-rows"]');
      if (tbody) {
        tbody.innerHTML = orders.map((o) => `
          <tr>
            <td>${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.date)}</td>
            <td class="align-right">${escapeHtml(fmt(o.price, o.currency))}</td>
          </tr>
        `).join('');
      }
      set('total', fmt(invoice.total, invoice.currency));

      // The bank account passed in is already the one matching this
      // invoice's own currency (see call sites) — so its address, sort
      // code, IBAN etc. are specifically the ones for that currency, not
      // some other account's. If there's nothing on file, the whole box
      // is hidden rather than shown empty.
      const paymentBox = root.querySelector('[data-field="payment-details"]');
      const lines = bankAccount ? bankAccountLines(bankAccount) : [];
      if (paymentBox) {
        if (lines.length) {
          const fieldsEl = paymentBox.querySelector('[data-field="payment-fields"]');
          if (fieldsEl) {
            fieldsEl.innerHTML = lines.map((l) => `
              <div class="invoice-field"><span class="label">${escapeHtml(l.label)}:</span> <span class="value">${escapeHtml(l.value)}</span></div>
            `).join('');
          }
        } else {
          paymentBox.style.display = 'none';
        }
      }

      set('footer-email', company?.email);
      set('footer-contact', company?.contact);
    }
  });
}
