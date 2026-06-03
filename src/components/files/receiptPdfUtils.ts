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

interface LogoDetails {
  base64: string;
  width: number;
  height: number;
}

interface ExtraDetails {
  address?: string;
  locality?: string;
  file_number?: number;
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
const BRAND_ACCENT: [number, number, number] = [186, 126, 242]; // Lavanda de Vicka
const WATERMARK_RED: [number, number, number] = [220, 53, 69];

// Cache para Base64 y dimensiones de imágenes
const logoCache = new Map<string, LogoDetails | null>();

async function loadImageDetails(url: string): Promise<LogoDetails | null> {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url)!;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Medir dimensiones naturales de la imagen para evitar estiramientos
    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = base64;
    });

    const details = { base64, ...dimensions };
    logoCache.set(url, details);
    return details;
  } catch {
    logoCache.set(url, null);
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
  
  let labelMoneda = 'PESOS';
  if (currency.toUpperCase() === 'USD') labelMoneda = 'DOLARES';
  if (currency.toUpperCase() === 'EUR') labelMoneda = 'EUROS';

  return `${texto.trim()} ${labelMoneda} CON ${decStr}/100`.trim();
}

function getCurrencySymbol(cur: string) {
  if (cur.toUpperCase() === 'USD') return 'U$S';
  if (cur.toUpperCase() === 'EUR') return '€';
  return '$';
}

function getCurrencyName(cur: string) {
  if (cur.toUpperCase() === 'USD') return 'DOLARES';
  if (cur.toUpperCase() === 'EUR') return 'EUROS';
  return 'PESOS';
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
  logoDetails: LogoDetails | null,
  copyLabel: string,
  items: ReceiptItem[],
  extraDetails?: ExtraDetails,
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  const width = w - margin * 2;
  const isVicka = agency.name?.toLowerCase().includes('vicka') || false;

  // ---------- Header Box ----------
  if (isVicka) {
    // Fondo gris claro
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, yOffset + 5, width, 28, 'F');

    // Banda violeta superior con patrón de V (triángulos)
    doc.setFillColor(186, 126, 242);
    doc.rect(margin, yOffset + 5, width, 3, 'F');
    doc.setStrokeColor(255, 255, 255);
    doc.setLineWidth(0.4);
    const step = 3.5;
    for (let x = margin; x < w - margin; x += step) {
      doc.line(x, yOffset + 5, x + step / 2, yOffset + 8);
      doc.line(x + step / 2, yOffset + 8, x + step, yOffset + 5);
    }

    // Banda violeta inferior con patrón de V
    doc.setFillColor(186, 126, 242);
    doc.rect(margin, yOffset + 28, width, 3, 'F');
    for (let x = margin; x < w - margin; x += step) {
      doc.line(x, yOffset + 28, x + step / 2, yOffset + 31);
      doc.line(x + step / 2, yOffset + 31, x + step, yOffset + 28);
    }

    // Cuadrado "X" en el centro
    doc.setFillColor(186, 126, 242);
    doc.rect(w / 2 - 6, yOffset + 9, 12, 12, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('X', w / 2, yOffset + 18.5, { align: 'center' });

    doc.setFontSize(5.5);
    doc.text('Documento no válido', w / 2, yOffset + 23.5, { align: 'center' });
    doc.text('como factura', w / 2, yOffset + 26.2, { align: 'center' });

    // Logo de Vicka a la izquierda (escalado responsivo)
    if (logoDetails) {
      const ratio = logoDetails.width / logoDetails.height;
      let lW = 16 * ratio;
      let lH = 16;
      if (lW > 24) {
        lW = 24;
        lH = 24 / ratio;
      }
      const logoX = margin + 4;
      const logoY = yOffset + 9.5 + (16 - lH) / 2;
      try {
        doc.addImage(logoDetails.base64, 'AUTO', logoX, logoY, lW, lH);
      } catch (e) {
        /* ignore */
      }
    }

    // Datos a la derecha
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    let contactY = yOffset + 11.5;
    let website = '';
    if (agency.email) {
      const parts = agency.email.split('@');
      if (parts.length > 1) website = `www.${parts[1]}`;
    }
    if (website) { doc.text(website, w - margin - 4, contactY, { align: 'right' }); contactY += 3.2; }
    if (agency.email) { doc.text(agency.email, w - margin - 4, contactY, { align: 'right' }); contactY += 3.2; }
    if (agency.phone) { doc.text(`Tel. ${agency.phone}`, w - margin - 4, contactY, { align: 'right' }); contactY += 3.2; }
    if (agency.address) { doc.text(agency.address, w - margin - 4, contactY, { align: 'right' }); contactY += 3.2; }
    if (agency.cuit) { doc.text(`Monotributo: ${agency.cuit}`, w - margin - 4, contactY, { align: 'right' }); contactY += 3.2; }
  } else {
    // Diseño genérico moderno con colores de la marca
    doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.rect(margin, yOffset + 5, width, 26, 'F');
    doc.setFillColor(186, 126, 242); // Línea decorativa
    doc.rect(margin, yOffset + 31, width, 1.2, 'F');

    if (logoDetails) {
      const ratio = logoDetails.width / logoDetails.height;
      let lW = 15 * ratio;
      let lH = 15;
      if (lW > 25) {
        lW = 25;
        lH = 25 / ratio;
      }
      try {
        doc.addImage(logoDetails.base64, 'AUTO', margin + 4, yOffset + 10.5, lW, lH);
      } catch (e) {
        /* ignore */
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(agency.name || 'Mi Agencia', margin + 30, yOffset + 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const headerLine1 = [agency.address, agency.phone].filter(Boolean).join('  ·  ');
    const headerLine2 = [agency.cuit ? `CUIT: ${agency.cuit}` : '', agency.email].filter(Boolean).join('  ·  ');
    if (headerLine1) doc.text(headerLine1, margin + 30, yOffset + 19);
    if (headerLine2) doc.text(headerLine2, margin + 30, yOffset + 23);
  }

  // Label de la copia arriba a la derecha
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.text(copyLabel, w - margin, yOffset + 3, { align: 'right' });

  // ---------- Fecha y Nro Recibo ----------
  const y = yOffset + 40;
  
  // Ciudad y fecha alineadas
  let city = 'MAR DEL PLATA';
  if (agency.address) {
    const parts = agency.address.split(',');
    if (parts.length > 1) {
      city = parts[parts.length - 1].trim().toUpperCase();
    }
  }
  const dateObj = new Date(receipt.payment_date);
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const formattedDate = `${city}, ${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formattedDate, margin, y);

  // Recibo N° en píldora redondeada
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.roundedRect(w - margin - 55, yOffset + 35, 55, 7, 2.2, 2.2, 'S');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO X:', w - margin - 52, yOffset + 39.5);
  doc.text(`N° 1000 -${String(receipt.receipt_number).padStart(8, '0')}`, w - margin - 3, yOffset + 39.5, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, yOffset + 44, w - margin, yOffset + 44);

  // ---------- Cliente y Domicilio ----------
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Señor:', margin, yOffset + 48.5);
  doc.setFont('helvetica', 'normal');
  doc.text((receipt.client_name || '').toUpperCase(), margin + 11, yOffset + 48.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Domicilio:', margin, yOffset + 53.5);
  doc.setFont('helvetica', 'normal');
  doc.text((extraDetails?.address || '—').toUpperCase(), margin + 15, yOffset + 53.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Localidad:', margin + 100, yOffset + 53.5);
  doc.setFont('helvetica', 'normal');
  doc.text((extraDetails?.locality || '—').toUpperCase(), margin + 116, yOffset + 53.5);

  // Línea divisoria
  doc.line(margin, yOffset + 57, w - margin, yOffset + 57);

  // ---------- Monto en letras y Referencia ----------
  const pdfTotals = computeReceiptTotals(items as any, receipt.currency);
  const totalAmountForPdf = pdfTotals.convertedTotal;

  doc.setFont('helvetica', 'bold');
  doc.text(`Recibimos la cantidad de ${getCurrencyName(receipt.currency)}:`, margin, yOffset + 61.5);
  doc.text(`R. ${extraDetails?.file_number || '—'}`, w - margin, yOffset + 61.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const letrasText = numeroALetras(totalAmountForPdf, receipt.currency).toUpperCase();
  doc.text(letrasText, margin, yOffset + 66);

  // Línea divisoria
  doc.line(margin, yOffset + 69.5, w - margin, yOffset + 69.5);

  // ---------- Concepto ----------
  doc.setFont('helvetica', 'bold');
  doc.text('en concepto de:', margin, yOffset + 74);
  
  doc.setFont('helvetica', 'normal');
  const conceptLines = doc.splitTextToSize((receipt.concept || '—').toUpperCase(), width);
  doc.text(conceptLines, margin, yOffset + 78.5);
  
  let currentY = yOffset + 78.5 + conceptLines.length * 4;

  if (receipt.notes) {
    const noteLines = doc.splitTextToSize((receipt.notes).toUpperCase(), width);
    doc.text(noteLines, margin, currentY);
    currentY += noteLines.length * 4;
  }

  // Línea divisoria fija antes del total
  doc.line(margin, yOffset + 100, w - margin, yOffset + 100);

  // ---------- Moneda recibida / TOTAL ----------
  doc.setFont('helvetica', 'bold');
  doc.text('Moneda recibida:', margin, yOffset + 104.5);
  doc.text('TOTAL', w - margin, yOffset + 104.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  // Si hay desglose de items multimoneda, los mostramos
  const effectiveItems = items.length > 0 ? items : [{ amount: receipt.amount, currency: receipt.currency }];
  let iy = yOffset + 109.5;
  effectiveItems.forEach((it, idx) => {
    // Si hay más de 3 items en el desglose, los mostramos con un interlineado menor para evitar colisión
    const spacing = effectiveItems.length > 3 ? 3 : 4.5;
    if (iy < yOffset + 120) {
      doc.text(`${getCurrencyName(it.currency)}  ${it.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, margin, iy);
      doc.text(`${getCurrencySymbol(it.currency)}:  ${it.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, w - margin, iy, { align: 'right' });
      iy += spacing;
    }
  });

  // Línea divisoria
  doc.line(margin, yOffset + 122, w - margin, yOffset + 122);

  // ---------- Firmas ----------
  const sigY = yOffset + 133;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.line(margin + 5, sigY, margin + 60, sigY);
  doc.line(w - margin - 60, sigY, w - margin - 5, sigY);
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Autorizada', margin + 32.5, sigY + 3.5, { align: 'center' });
  doc.text('Firma Cliente', w - margin - 32.5, sigY + 3.5, { align: 'center' });

  // Línea decorativa del pie del recibo
  if (isVicka) {
    doc.setFillColor(186, 126, 242);
    doc.rect(margin, yOffset + 142, width, 1.5, 'F');
  } else {
    doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.rect(margin, yOffset + 142, width, 1, 'F');
  }

  // ---------- Watermark ANULADO ----------
  if (receipt.status === 'cancelled') {
    drawCancelledWatermark(doc, yOffset, 148.5);
  }
}

export async function generateReceiptPDF(
  receipt: Receipt,
  agency: Agency,
  items: ReceiptItem[] = [],
  extraDetails?: ExtraDetails,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const halfHeight = 148.5;

  // Carga optimizada con caché del logo de la agencia
  const logoDetails = await loadImageDetails(agency.logo_url);

  const effectiveItems: ReceiptItem[] = items.length > 0
    ? items
    : [{
        amount: receipt.amount,
        currency: receipt.currency,
        payment_method: receipt.payment_method,
      }];

  // Dibujar copia de la Agencia
  drawReceipt(doc, receipt, agency, 0, logoDetails, 'COPIA AGENCIA', effectiveItems, extraDetails);

  // Línea de corte punteada
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

  // Dibujar copia del Cliente
  drawReceipt(doc, receipt, agency, halfHeight, logoDetails, 'COPIA CLIENTE', effectiveItems, extraDetails);

  doc.save(`Recibo-${String(receipt.receipt_number).padStart(6, '0')}.pdf`);
}
