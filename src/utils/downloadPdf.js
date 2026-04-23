import html2pdf from 'html2pdf.js';

/**
 * Download a DOM element as a PDF with crisp, full-size rendering.
 *
 * The trick: temporarily resize the element to exactly match the PDF page
 * width (in px at the chosen DPI), so html2canvas captures it at 1:1 scale
 * and nothing gets shrunk/blurred.
 *
 * @param {string} elementId  – id of the DOM element to capture
 * @param {string} filename   – output filename (without .pdf)
 * @param {object} [opts]     – optional overrides
 */
export function downloadPdf(elementId, filename, opts = {}) {
  const el = document.getElementById(elementId);
  if (!el) {
    alert('Nothing to download — content not found.');
    return;
  }

  // Hide non-print elements
  const noPrintEls = el.querySelectorAll('.no-print');
  noPrintEls.forEach((e) => (e.style.display = 'none'));

  // Save original styles
  const origWidth = el.style.width;
  const origMaxWidth = el.style.maxWidth;
  const origMargin = el.style.margin;
  const origPadding = el.style.padding;

  // Determine content width — use opts or default to 720px (letter)
  const contentWidth = (opts.html2canvas && opts.html2canvas.width) || 720;

  // Set element to the target width
  el.style.width = contentWidth + 'px';
  el.style.maxWidth = contentWidth + 'px';
  el.style.margin = '0';
  el.style.padding = '0';

  const defaultOpts = {
    margin: [0.3, 0.4, 0.3, 0.4], // top, left, bottom, right in inches
    filename: `${filename}.pdf`,
    image: { type: 'png', quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
      width: contentWidth,
      windowWidth: contentWidth,
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['css', 'legacy'], before: ['.html2pdf__page-break'], avoid: ['tr', '.page-break-avoid'] },
  };

  const merged = {
    ...defaultOpts,
    ...opts,
    filename: `${filename}.pdf`,
    html2canvas: { ...defaultOpts.html2canvas, ...(opts.html2canvas || {}) },
    jsPDF: { ...defaultOpts.jsPDF, ...(opts.jsPDF || {}) },
  };

  // Override pagebreak to always include html2pdf__page-break trigger
  merged.pagebreak = {
    mode: ['css', 'legacy'],
    before: ['.html2pdf__page-break'],
    avoid: ['tr', '.page-break-avoid'],
    ...(opts.pagebreak || {}),
  };

  html2pdf()
    .set(merged)
    .from(el)
    .save()
    .then(() => {
      restore();
    })
    .catch((err) => {
      console.error('PDF generation failed:', err);
      restore();
      alert('PDF download failed. Please try the Print button instead.');
    });

  function restore() {
    el.style.width = origWidth;
    el.style.maxWidth = origMaxWidth;
    el.style.margin = origMargin;
    el.style.padding = origPadding;
    noPrintEls.forEach((e) => (e.style.display = ''));
  }
}

/**
 * Landscape variant for wider documents (G703, reports, backup sheets).
 */
export function downloadPdfLandscape(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) {
    alert('Nothing to download — content not found.');
    return;
  }
  downloadPdf(elementId, filename, {
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
    html2canvas: {
      scale: 3,
      width: 960, // 10in content width for landscape
      windowWidth: 960,
    },
  });
  // Also widen the element for landscape
  setTimeout(() => {
    el.style.width = '960px';
    el.style.maxWidth = '960px';
  }, 10);
}
