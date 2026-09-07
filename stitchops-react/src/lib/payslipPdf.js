import { jsPDF } from 'jspdf';
import { fmt } from './helpers';

// Deliberately plain — the user's said the invoice redesign will double as
// the salary-slip format, so this exists to make Download actually produce
// a file rather than to be the final design.
export function downloadPayslipPdf({ slip, employee, company }) {
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
  doc.text('SALARY SLIP', pageWidth - margin, 56, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Slip No: ${slip.slipNo}`, pageWidth - margin, 76, { align: 'right' });
  doc.text(`Date: ${slip.approvedDate}`, pageWidth - margin, 90, { align: 'right' });
  doc.text(`Status: ${slip.paymentStatus}`, pageWidth - margin, 104, { align: 'right' });

  let y = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Paid To', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (employee?.name) { doc.text(employee.name, margin, y); y += 14; }
  if (employee?.designation) { doc.text(employee.designation, margin, y); y += 14; }
  if (employee?.email) { doc.text(employee.email, margin, y); y += 14; }

  y += 16;
  const tableWidth = pageWidth - margin * 2;
  doc.setFillColor(40, 45, 70);
  doc.rect(margin, y, tableWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Description', margin + 10, y + 16);
  doc.text('Amount', pageWidth - margin - 10, y + 16, { align: 'right' });
  y += 24;

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  const rows = [
    ['Base Salary', slip.baseSalary],
    ['Commission', slip.commission]
  ];
  rows.forEach(([label, amt], idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(246, 247, 250);
      doc.rect(margin, y, tableWidth, 22, 'F');
    }
    doc.text(label, margin + 10, y + 15);
    doc.text(fmt(amt, slip.currency), pageWidth - margin - 10, y + 15, { align: 'right' });
    y += 22;
  });

  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Total', pageWidth - margin - 160, y);
  doc.text(fmt(slip.total, slip.currency), pageWidth - margin - 10, y, { align: 'right' });

  doc.save(`${slip.slipNo}.pdf`);
}
