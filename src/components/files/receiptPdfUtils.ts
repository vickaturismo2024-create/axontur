import jsPDF from 'jspdf';

interface Receipt {
  receipt_number: number;
  client_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  concept: string;
  notes: string;
}

interface Agency {
  name: string;
  phone: string;
  address: string;
  cuit: string;
  email: string;
  logo_url: string;
}

const METHODS: Record<string, string> = {
  transfer: 'Transferencia', credit_card: 'Tarjeta de Crédito', debit_card: 'Tarjeta de Débito',
  cash: 'Efectivo', check: 'Cheque', other: 'Otro',
};

const BRAND_PRIMARY = [30, 58, 95];    // Dark blue
const BRAND_ACCENT = [41, 128, 185];   // Medium blue
const BRAND_LIGHT = [236, 240, 241];   // Light gray

async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawReceipt(
  doc: jsPDF,
  receipt: Receipt,
  agency: Agency,
  yOffset: number,
  logoBase64: string | null,
  copyLabel: string
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = yOffset + 5;

  // Header band
  doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.rect(0, yOffset, w, 22, 'F');

  // Accent line below header
  doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.rect(0, yOffset + 22, w, 1.5, 'F');

  // Logo
  let textStartX = margin;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'AUTO', margin, yOffset + 3, 16, 16);
      textStartX = margin + 20;
    } catch {
      // skip logo if invalid
    }
  }

  // Agency name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'Mi Agencia', textStartX, yOffset + 11);

  // Agency details in header
  const parts = [agency.address, agency.phone, agency.cuit ? `CUIT: ${agency.cuit}` : '', agency.email].filter(Boolean);
  if (parts.length > 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(parts.join('  |  '), textStartX, yOffset + 17);
  }

  // Copy label (top right)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(copyLabel, w - margin, yOffset + 8, { align: 'right' });

  y = yOffset + 28;

  // Receipt title
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO', w / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(12);
  doc.text(`N° ${String(receipt.receipt_number).padStart(4, '0')}`, w / 2, y, { align: 'center' });
  y += 9;

  // Separator line
  doc.setDrawColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, w - margin, y);
  y += 7;

  // Details
  doc.setTextColor(50, 50, 50);
  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, margin + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 65, y);
    y += 6;
  };

  addRow('Fecha:', new Date(receipt.payment_date).toLocaleDateString('es-AR'));
  addRow('Cliente:', receipt.client_name);
  addRow('Concepto:', receipt.concept);
  addRow('Método:', METHODS[receipt.payment_method] || receipt.payment_method);

  y += 3;
  doc.setDrawColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.line(margin, y, w - margin, y);
  y += 8;

  // Total with background
  doc.setFillColor(BRAND_LIGHT[0], BRAND_LIGHT[1], BRAND_LIGHT[2]);
  doc.roundedRect(margin, y - 5, w - margin * 2, 12, 2, 2, 'F');

  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', margin + 5, y + 2);
  doc.text(
    `${receipt.currency} ${receipt.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    w - margin - 5, y + 2, { align: 'right' }
  );
  y += 12;

  // Notes
  if (receipt.notes) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Observaciones: ${receipt.notes}`, margin + 3, y, { maxWidth: w - margin * 2 - 6 });
    y += 8;
  }

  // Signatures
  const sigY = yOffset + 128;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(margin + 5, sigY, margin + 70, sigY);
  doc.line(w - margin - 70, sigY, w - margin - 5, sigY);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Agencia', margin + 37.5, sigY + 4, { align: 'center' });
  doc.text('Firma Cliente', w - margin - 37.5, sigY + 4, { align: 'center' });

  // Bottom accent line
  doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.rect(0, yOffset + 140, w, 1, 'F');
}

export async function generateReceiptPDF(receipt: Receipt, agency: Agency) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const halfHeight = 148.5;

  // Load logo
  const logoBase64 = await loadImageAsBase64(agency.logo_url);

  // Draw top copy (agency)
  drawReceipt(doc, receipt, agency, 0, logoBase64, 'Copia Agencia');

  // Dotted cut line in the middle
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  const dashLen = 3;
  const gapLen = 3;
  for (let x = 10; x < w - 10; x += dashLen + gapLen) {
    doc.line(x, halfHeight, Math.min(x + dashLen, w - 10), halfHeight);
  }
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('✂  CORTAR AQUÍ', w / 2, halfHeight - 1.5, { align: 'center' });

  // Draw bottom copy (client)
  drawReceipt(doc, receipt, agency, halfHeight, logoBase64, 'Copia Cliente');

  doc.save(`Recibo-${String(receipt.receipt_number).padStart(4, '0')}.pdf`);
}
