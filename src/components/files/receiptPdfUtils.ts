import jsPDF from 'jspdf';
import { computeReceiptTotals } from '@/lib/receiptTotals';

interface Receipt {
  receipt_number: number;
  client_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  concept: string;
  notes: string;
  status?: string;
}

interface Agency {
  name: string;
  phone: string;
  address: string;
  cuit: string;
  email: string;
  logo_url: string;
}

interface ReceiptItem {
  amount: number;
  currency: string;
  payment_method?: string;
  exchange_rate?: number | null;
  service_currency?: string | null;
  notes?: string;
}

const METHODS: Record<string, string> = {
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de Crédito',
  debit_card: 'Tarjeta de Débito',
  cash: 'Efectivo',
  check: 'Cheque',
  other: 'Otro',
};

const BRAND_PRIMARY: [number, number, number] = [30, 58, 95];
const BRAND_ACCENT: [number, number, number] = [41, 128, 185];
const BRAND_LIGHT: [number, number, number] = [236, 240, 241];
const WATERMARK_RED: [number, number, number] = [220, 53, 69];

async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================================================
// Conversión de números a letras (helper)
// ============================================================================
const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES: Record<number, string> = {
  10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
  20: 'VEINTE', 30: 'TREINTA', 40: 'CUARENTA', 50: 'CINCUENTA',
  60: 'SESENTA', 70: 'SETENTA', 80: 'OCHENTA', 90: 'NOVENTA',
};
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function decenaALetras(n: number): string {
  if (n === 0) return '';
  if (ESPECIALES[n]) return ESPECIALES[n];
  if (n < 20) return 'DIEC' + UNIDADES[n - 10].toLowerCase().replace(/^./, (c) => c.toUpperCase()).toUpperCase();
  if (n < 30) return 'VEINTI' + UNIDADES[n - 20].toLowerCase();
  const dec = Math.floor(n / 10) * 10;
  const uni = n % 10;
  return ESPECIALES[dec] + (uni > 0 ? ' Y ' + UNIDADES[uni] : '');
}

function centenaALetras(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const cen = Math.floor(n / 100);
  const resto = n % 100;
  return (CENTENAS[cen] + (resto > 0 ? ' ' + decenaALetras(resto) : '')).trim();
}

function milesALetras(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return centenaALetras(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const milesText = miles === 1 ? 'MIL' : centenaALetras(miles) + ' MIL';
  return milesText + (resto > 0 ? ' ' + centenaALetras(resto) : '');
}

export function numeroALetras(num: number, currency = ''): string {
  const entero = Math.floor(Math.abs(num));
  const decimales = Math.round((Math.abs(num) - entero) * 100);
  let texto: string;
  if (entero === 0) texto = 'CERO';
  else if (entero < 1_000_000) texto = milesALetras(entero);
  else {
    const mill = Math.floor(entero / 1_000_000);
    const resto = entero % 1_000_000;
    const millText = mill === 1 ? 'UN MILLON' : milesALetras(mill) + ' MILLONES';
    texto = millText + (resto > 0 ? ' ' + milesALetras(resto) : '');
  }
  const decStr = String(decimales).padStart(2, '0');
  return `${texto.trim()} ${currency} CON ${decStr}/100`.trim();
}

// ============================================================================
// Watermark "ANULADO"
// ============================================================================
function drawCancelledWatermark(doc: jsPDF, yOffset: number, halfHeight: number) {
  const w = doc.internal.pageSize.getWidth();
  const cx = w / 2;
  const cy = yOffset + halfHeight / 2;

  (doc as any).saveGraphicsState?.();
  doc.setTextColor(WATERMARK_RED[0], WATERMARK_RED[1], WATERMARK_RED[2]);
  doc.setFontSize(80);
  doc.setFont('helvetica', 'bold');
  // jsPDF supports rotated text via the angle option
  doc.text('ANULADO', cx, cy, { align: 'center', angle: 30 } as any);
  (doc as any).restoreGraphicsState?.();
}

// ============================================================================
// Render de un recibo (mitad de A4)
// ============================================================================
function drawReceipt(
  doc: jsPDF,
  receipt: Receipt,
  agency: Agency,
  yOffset: number,
  logoBase64: string | null,
  copyLabel: string,
  items: ReceiptItem[],
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;

  // ---------- Header ----------
  doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.rect(0, yOffset, w, 24, 'F');
  doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.rect(0, yOffset + 24, w, 1.2, 'F');

  let textStartX = margin;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'AUTO', margin, yOffset + 3, 18, 18);
      textStartX = margin + 22;
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'Mi Agencia', textStartX, yOffset + 11);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const headerLine1 = [agency.address, agency.phone].filter(Boolean).join('  ·  ');
  const headerLine2 = [agency.cuit ? `CUIT: ${agency.cuit}` : '', agency.email].filter(Boolean).join('  ·  ');
  if (headerLine1) doc.text(headerLine1, textStartX, yOffset + 16);
  if (headerLine2) doc.text(headerLine2, textStartX, yOffset + 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(copyLabel, w - margin, yOffset + 8, { align: 'right' });

  // ---------- Título y N° ----------
  let y = yOffset + 32;
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO', margin, y);

  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.text(`N° ${String(receipt.receipt_number).padStart(6, '0')}`, w - margin, y, { align: 'right' });

  y += 4;
  doc.setDrawColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, w - margin, y);
  y += 6;

  // ---------- Datos ----------
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FECHA:', margin, y);
  doc.text('CLIENTE:', margin + 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(receipt.payment_date).toLocaleDateString('es-AR'), margin + 16, y);
  doc.text(receipt.client_name || '—', margin + 76, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO:', margin, y);
  doc.setFont('helvetica', 'normal');
  const conceptLines = doc.splitTextToSize(receipt.concept || '—', w - margin * 2 - 22);
  doc.text(conceptLines, margin + 22, y);
  y += conceptLines.length * 4 + 2;

  // ---------- Tabla de líneas ----------
  if (items.length > 0) {
    doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.rect(margin, y, w - margin * 2, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MONTO', margin + 2, y + 4);
    doc.text('MONEDA', margin + 35, y + 4);
    doc.text('MÉTODO', margin + 60, y + 4);
    doc.text('COTIZACIÓN', w - margin - 2, y + 4, { align: 'right' });
    y += 5.5;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    items.forEach((it, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, y, w - margin * 2, 5, 'F');
      }
      doc.text(it.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 }), margin + 2, y + 3.5);
      doc.text(it.currency, margin + 35, y + 3.5);
      doc.text(METHODS[it.payment_method || ''] || it.payment_method || '—', margin + 60, y + 3.5);
      const rateText = it.exchange_rate && it.service_currency
        ? `${it.service_currency} @ ${it.exchange_rate}`
        : '—';
      doc.text(rateText, w - margin - 2, y + 3.5, { align: 'right' });
      y += 5;
    });
    y += 1;
  }

  // ---------- Total ----------
  doc.setFillColor(BRAND_LIGHT[0], BRAND_LIGHT[1], BRAND_LIGHT[2]);
  doc.roundedRect(margin, y, w - margin * 2, 9, 2, 2, 'F');
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', margin + 3, y + 6);
  doc.text(
    `${receipt.currency} ${receipt.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    w - margin - 3,
    y + 6,
    { align: 'right' },
  );
  y += 11;

  // ---------- Total en letras ----------
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const letrasText = `Son: ${numeroALetras(receipt.amount, receipt.currency)}`;
  const letrasLines = doc.splitTextToSize(letrasText, w - margin * 2);
  doc.text(letrasLines, margin, y);
  y += letrasLines.length * 3.5 + 2;

  // ---------- Notas ----------
  if (receipt.notes) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(`Observaciones: ${receipt.notes}`, w - margin * 2);
    doc.text(noteLines, margin, y);
  }

  // ---------- Firmas ----------
  const sigY = yOffset + 128;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(margin + 5, sigY, margin + 70, sigY);
  doc.line(w - margin - 70, sigY, w - margin - 5, sigY);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Agencia', margin + 37.5, sigY + 4, { align: 'center' });
  doc.text('Firma Cliente', w - margin - 37.5, sigY + 4, { align: 'center' });

  doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.rect(0, yOffset + 140, w, 1, 'F');

  // ---------- Watermark ANULADO ----------
  if (receipt.status === 'cancelled') {
    drawCancelledWatermark(doc, yOffset, 141);
  }
}

export async function generateReceiptPDF(
  receipt: Receipt,
  agency: Agency,
  items: ReceiptItem[] = [],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const halfHeight = 148.5;

  const logoBase64 = await loadImageAsBase64(agency.logo_url);

  // Si no hay items, generamos uno con los datos del recibo principal
  const effectiveItems: ReceiptItem[] = items.length > 0
    ? items
    : [{
        amount: receipt.amount,
        currency: receipt.currency,
        payment_method: receipt.payment_method,
      }];

  drawReceipt(doc, receipt, agency, 0, logoBase64, 'COPIA AGENCIA', effectiveItems);

  // Línea de corte
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

  drawReceipt(doc, receipt, agency, halfHeight, logoBase64, 'COPIA CLIENTE', effectiveItems);

  doc.save(`Recibo-${String(receipt.receipt_number).padStart(6, '0')}.pdf`);
}
