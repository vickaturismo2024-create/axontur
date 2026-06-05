import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function generatePDFBlob(containerSelector: string): Promise<Blob> {
  const container = document.querySelector(containerSelector);
  if (!container) throw new Error('Container not found');

  const pages = container.querySelectorAll('.pdf-page, .pdf-page-mobile');
  if (pages.length === 0) throw new Error('No PDF pages found');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Overlay interactive links programmatically from the DOM
    const pageRect = page.getBoundingClientRect();
    const links = page.querySelectorAll('a');

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkRect = link.getBoundingClientRect();

      // Calculate relative coordinates in pixels
      const relLeft = linkRect.left - pageRect.left;
      const relTop = linkRect.top - pageRect.top;
      const relWidth = linkRect.width;
      const relHeight = linkRect.height;

      // Scale to A4 dimensions in millimeters
      const scaleX = pdfWidth / pageRect.width;
      const scaleY = pdfHeight / pageRect.height;

      const pdfX = relLeft * scaleX;
      const pdfY = relTop * scaleY;
      const pdfW = relWidth * scaleX;
      const pdfH = relHeight * scaleY;

      // Resolve relative URLs to absolute
      let absoluteUrl = href;
      if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
        if (href.startsWith('/')) {
          absoluteUrl = window.location.origin + href;
        } else {
          absoluteUrl = 'https://' + href;
        }
      }

      // Add link annotation to the current page in jsPDF
      pdf.link(pdfX, pdfY, pdfW, pdfH, { url: absoluteUrl });
    });
  }

  return pdf.output('blob');
}

export async function generatePDF(containerSelector: string, fileName: string = 'presupuesto.pdf') {
  const blob = await generatePDFBlob(containerSelector);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

