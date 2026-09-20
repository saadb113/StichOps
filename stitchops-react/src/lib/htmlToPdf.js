import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Both invoice.html and payslip.html (public/pdf-templates/) are plain
// HTML/CSS design files someone can open and restyle directly in a
// browser — this loads one, hands its root element to a `populate`
// callback to fill in real data via [data-field] hooks, then rasterizes it
// (html2canvas) into a jsPDF page. That keeps the PDF pixel-faithful to
// whatever the template actually looks like, instead of us re-drawing the
// layout by hand with jsPDF primitives.

const templateCache = {};
async function loadTemplate(path) {
  if (!templateCache[path]) {
    templateCache[path] = fetch(path).then((r) => r.text());
  }
  return templateCache[path];
}

export async function renderTemplateToPdf({ templatePath, rootSelector, populate, filename }) {
  const html = await loadTemplate(templatePath);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const styleText = [...parsed.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  const root = parsed.querySelector(rootSelector);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.zIndex = '-1';
  container.style.background = '#fff';

  const styleTag = document.createElement('style');
  styleTag.textContent = styleText;
  container.appendChild(styleTag);
  container.appendChild(root);
  document.body.appendChild(container);

  populate(root);

  const img = root.querySelector('img');
  if (img && !img.complete) {
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
  }

  try {
    const canvas = await html2canvas(root, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let remaining = imgHeight;
    let position = 0;
    let page = 0;
    while (remaining > 0) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      remaining -= pageHeight;
      position -= pageHeight;
      page += 1;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
