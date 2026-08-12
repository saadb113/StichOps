import { jsPDF } from 'jspdf';
import { fmt } from './helpers';

export function downloadInvoicePdf({ invoice, customer, company, orders }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(company?.name || 'StitchOps', margin, 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  if (company?.address) doc.text(company.address, margin, 72);

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('INVOICE', pageWidth - margin, 56, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const invoiceLabel = invoice.invoiceNo + (invoice.version > 1 ? ` (v${invoice.version})` : '');
  doc.text(`Invoice No: ${invoiceLabel}`, pageWidth - margin, 76, { align: 'right' });
  doc.text(`Date: ${invoice.generatedDate}`, pageWidth - margin, 90, { align: 'right' });
  doc.text(`Status: ${invoice.paymentStatus}`, pageWidth - margin, 104, { align: 'right' });

  let y = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill To', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (customer?.company) { doc.text(customer.company, margin, y); y += 14; }
  if (customer?.name) { doc.text(customer.name, margin, y); y += 14; }
  if (customer?.email) { doc.text(customer.email, margin, y); y += 14; }
  if (customer?.address) { doc.text(customer.address, margin, y); y += 14; }

  y += 16;
  const tableWidth = pageWidth - margin * 2;
  doc.setFillColor(40, 45, 70);
  doc.rect(margin, y, tableWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Order', margin + 10, y + 16);
  doc.text('Date', margin + tableWidth * 0.55, y + 16);
  doc.text('Price', pageWidth - margin - 10, y + 16, { align: 'right' });
  y += 24;

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  orders.forEach((o, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(246, 247, 250);
      doc.rect(margin, y, tableWidth, 22, 'F');
    }
    doc.text(o.name, margin + 10, y + 15);
    doc.text(o.date, margin + tableWidth * 0.55, y + 15);
    doc.text(fmt(o.price, o.currency), pageWidth - margin - 10, y + 15, { align: 'right' });
    y += 22;
  });

  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Total', pageWidth - margin - 160, y);
  doc.text(fmt(invoice.total, invoice.currency), pageWidth - margin - 10, y, { align: 'right' });

  doc.save(`${invoice.invoiceNo}.pdf`);
}
