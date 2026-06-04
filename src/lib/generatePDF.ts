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
