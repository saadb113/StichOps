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

const PAGE_HEIGHT = 848; // A4 aspect ratio at the template's 600px width

// Splits the populated invoice into fixed-height pages: header + "Bill To"
// only on page 1, order rows flow across as many pages as needed, and the
// total, payment details, Thank You and footer all attach to the LAST page
// (Thank You/footer pinned to its bottom). Rows are never cut mid-way.
function paginateInvoice(root) {
  const container = root.parentElement;
  const header = root.querySelector('.invoice-header');
  const billTo = root.querySelector('.invoice-bill-to');
  const table = root.querySelector('.invoice-table');
  const thead = table.querySelector('thead');
  const tfoot = table.querySelector('tfoot');
  const payment = root.querySelector('.invoice-payment-details');
  const closing = root.querySelector('.invoice-closing');
  const rows = [...table.querySelectorAll('tbody tr')];

  const makePage = () => {
    const p = root.cloneNode(false);
    p.style.margin = '0';
    p.style.height = `${PAGE_HEIGHT}px`;
    p.style.minHeight = `${PAGE_HEIGHT}px`;
    p.style.overflow = 'hidden';
    container.appendChild(p);
    return p;
  };
  const fits = (p) => p.scrollHeight <= p.clientHeight;
  const newTable = (withHead) => {
    const t = table.cloneNode(false);
    if (withHead) t.appendChild(thead.cloneNode(true));
    const tb = document.createElement('tbody');
    t.appendChild(tb);
    return { t, tb };
  };

  const pages = [];
  let page = makePage();
  pages.push(page);
  page.append(header, billTo);
  let { t, tb } = newTable(true);
  page.appendChild(t);

  rows.forEach((row, i) => {
    row.style.background = i % 2 ? '#F9F9F9' : '#FFFFFF';
    tb.appendChild(row);
    if (!fits(page) && tb.children.length > 1) {
      tb.removeChild(row);
      page = makePage();
      pages.push(page);
      ({ t, tb } = newTable(false));
      page.appendChild(t);
      tb.appendChild(row);
    }
  });

  const attachTail = () => {
    t.appendChild(tfoot);
    page.append(payment, closing);
  };
  attachTail();

  // Not enough room left for total + payment + Thank You: carry the last
  // row onto a fresh page so the total never sits alone without any rows.
  if (!fits(page) && tb.children.length > 1) {
    const last = tb.lastElementChild;
    tfoot.remove();
    payment.remove();
    closing.remove();
    tb.removeChild(last);
    page = makePage();
    pages.push(page);
    ({ t, tb } = newTable(false));
    page.appendChild(t);
    tb.appendChild(last);
    attachTail();
  }

  root.style.display = 'none';
  return pages;
}

export async function downloadInvoicePdf({ invoice, customer, company, orders, bankAccount }) {
  await renderTemplateToPdf({
    templatePath: '/pdf-templates/invoice.html',
    rootSelector: '.invoice-doc',
    paginate: paginateInvoice,
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
