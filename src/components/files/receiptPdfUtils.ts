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
  website?: string;
  logo_url: string;
  receipt_header_layout?: string;
  receipt_primary_color?: string;
  receipt_accent_color?: string;
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

function numeroALetrasSolo(num: number): string {
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
  if (decimales > 0) {
    return `${texto.trim()} CON ${String(decimales).padStart(2, '0')}/100`;
  }
  return texto.trim();
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

function hexToRgb(hex: string, defaultRgb: [number, number, number]): [number, number, number] {
  if (!hex) return defaultRgb;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return defaultRgb;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? defaultRgb : [r, g, b];
}

function drawIcon(doc: jsPDF, type: 'globe' | 'email' | 'phone' | 'pin', x: number, y: number, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.3);

  if (type === 'globe') {
    doc.circle(x + 1.2, y - 1.2, 1.2, 'S');
    doc.line(x + 1.2, y - 2.4, x + 1.2, y); // vertical
    doc.line(x, y - 1.2, x + 2.4, y - 1.2); // horizontal
  } else if (type === 'email') {
    doc.rect(x, y - 2.2, 2.4, 1.8, 'S');
    doc.line(x, y - 2.2, x + 1.2, y - 1.3);
    doc.line(x + 1.2, y - 1.3, x + 2.4, y - 2.2);
  } else if (type === 'phone') {
    doc.setLineWidth(0.5);
    doc.line(x + 0.4, y - 2, x + 0.4, y - 0.4);
    doc.setLineWidth(0.25);
    doc.line(x + 0.4, y - 2, x + 1.2, y - 2);
    doc.line(x + 0.4, y - 0.4, x + 1.2, y - 0.4);
  } else if (type === 'pin') {
    doc.circle(x + 1.2, y - 1.8, 0.8, 'FD');
    doc.line(x + 1.2, y - 1, x + 1.2, y);
  }
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
  bannerDetails: LogoDetails | null = null,
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  const width = w - margin * 2;

  // Resolve layout style (defaults to 'classic' unless configured as 'vicka' OR agency name matches and not classic)
  const isVicka = agency.receipt_header_layout === 'vicka' || 
    (agency.name?.toLowerCase().includes('vicka') && agency.receipt_header_layout !== 'classic' && agency.receipt_header_layout !== 'custom_banner');
  const isCustomBanner = agency.receipt_header_layout === 'custom_banner' && bannerDetails;

  const primaryRgb = hexToRgb(agency.receipt_primary_color || '', [30, 58, 95]);
  const accentRgb = hexToRgb(agency.receipt_accent_color || '', [186, 126, 242]);

  // ---------- Header Box ----------
  if (isCustomBanner && bannerDetails) {
    try {
      doc.addImage(bannerDetails.base64, 'AUTO', margin, yOffset + 5, width, 28);
    } catch (e) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yOffset + 5, width, 28, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text('Error al cargar la imagen de banner del encabezado', w / 2, yOffset + 20, { align: 'center' });
    }
  } else if (isVicka) {
    // Fondo gris claro
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, yOffset + 5, width, 28, 'F');

    // Banda violeta superior con patrón de V (triángulos)
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(margin, yOffset + 5, width, 6, 'F');
    doc.setStrokeColor(255, 255, 255);
    doc.setLineWidth(0.8);
    const step = 6;
    for (let x = margin + 2; x < w - margin - 2; x += step) {
      if (x + step >= w / 2 - 9 && x <= w / 2 + 9) {
        continue;
      }
      doc.line(x, yOffset + 6, x + 2, yOffset + 10);
      doc.line(x + 2, yOffset + 10, x + 4, yOffset + 6);
    }

    // Banda violeta inferior con patrón de V
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(margin, yOffset + 27, width, 6, 'F');
    for (let x = margin + 2; x < w - margin - 2; x += step) {
      if (x + step >= w / 2 - 9 && x <= w / 2 + 9) {
        continue;
      }
      doc.line(x, yOffset + 28, x + 2, yOffset + 32);
      doc.line(x + 2, yOffset + 32, x + 4, yOffset + 28);
    }

    // Cuadrado "X" en el centro
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(w / 2 - 8, yOffset + 5, 16, 16, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('X', w / 2, yOffset + 15, { align: 'center' });

    doc.setFontSize(6);
    doc.text('Documento no válido', w / 2, yOffset + 24, { align: 'center' });
    doc.text('como factura', w / 2, yOffset + 26.5, { align: 'center' });

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
      const logoY = yOffset + 11 + (20 - lH) / 2;
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

    let contactY = yOffset + 14;
    const rightAlignX = w - margin - 4;

    const drawContactLine = (text: string, iconType?: 'globe' | 'email' | 'phone' | 'pin') => {
      doc.text(text, rightAlignX, contactY, { align: 'right' });
      if (iconType) {
        const textWidth = doc.getTextWidth(text);
        const iconX = rightAlignX - textWidth - 4;
        drawIcon(doc, iconType, iconX, contactY, accentRgb);
      }
      contactY += 3.2;
    };

    let website = agency.website || '';
    if (!website && agency.email) {
      const parts = agency.email.split('@');
      if (parts.length > 1) website = `www.${parts[1]}`;
    }

    if (website) drawContactLine(website, 'globe');
    if (agency.email) drawContactLine(agency.email, 'email');
    if (agency.phone) drawContactLine(`Tel. ${agency.phone}`, 'phone');
    if (agency.address) drawContactLine(agency.address, 'pin');
    if (agency.cuit) drawContactLine(`Monotributo: ${agency.cuit}`);
  } else {
    // Diseño genérico moderno con colores de la marca
    doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.rect(margin, yOffset + 5, width, 26, 'F');
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]); // Línea decorativa
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
  const y = yOffset + 44.2;
  
  // Ciudad y fecha alineadas
  let city = 'MAR DEL PLATA';
  if (agency.address) {
    const parts = agency.address.split(',');
    if (parts.length > 1) {
      city = parts[parts.length - 1].trim().toUpperCase();
    }
  }

  // Timezone-safe date extraction
  const dateParts = receipt.payment_date.split('-');
  let formattedDate = '';
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  if (dateParts.length === 3) {
    const year = dateParts[0];
    const monthIndex = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    formattedDate = `${city}, ${day} de ${months[monthIndex]} de ${year}`;
  } else {
    const dateObj = new Date(receipt.payment_date);
    formattedDate = `${city}, ${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formattedDate, margin, y);

  // Recibo N° en píldora redondeada
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.roundedRect(w - margin - 62, yOffset + 40, 62, 6, 2.2, 2.2, 'S');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO X:', w - margin - 59, yOffset + 44.2);
  doc.text(`N° 1000 -${String(receipt.receipt_number).padStart(8, '0')}`, w - margin - 3, yOffset + 44.2, { align: 'right' });

  // Línea divisoria (Gruesa)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, yOffset + 47.5, w - margin, yOffset + 47.5);

  // ---------- Cliente y Domicilio ----------
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Señor:', margin, yOffset + 52.5);
  doc.setFont('helvetica', 'normal');
  doc.text((receipt.client_name || '').toUpperCase(), margin + 11, yOffset + 52.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Domicilio:', margin, yOffset + 57.5);
  doc.setFont('helvetica', 'normal');
  doc.text((extraDetails?.address || '—').toUpperCase(), margin + 15, yOffset + 57.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Localidad:', margin + 100, yOffset + 57.5);
  doc.setFont('helvetica', 'normal');
  doc.text((extraDetails?.locality || '—').toUpperCase(), margin + 116, yOffset + 57.5);

  // Línea divisoria
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset + 60.5, w - margin, yOffset + 60.5);

  // ---------- Monto en letras y Referencia ----------
  const pdfTotals = computeReceiptTotals(items as any, receipt.currency);
  const totalAmountForPdf = pdfTotals.convertedTotal;

  let labelText = '';
  if (receipt.currency.toUpperCase() === 'USD') {
    labelText = 'Recibimos el equivalente a USD:';
  } else if (receipt.currency.toUpperCase() === 'EUR') {
    labelText = 'Recibimos el equivalente a EUR:';
  } else {
    labelText = 'Recibimos la cantidad de PESOS:';
  }

  doc.setFont('helvetica', 'bold');
  doc.text(labelText, margin, yOffset + 65.5);
  doc.text(`R. ${extraDetails?.file_number || '—'}`, w - margin, yOffset + 65.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const letrasText = numeroALetrasSolo(totalAmountForPdf).toUpperCase();
  doc.text(letrasText, margin, yOffset + 70.5);

  // Línea divisoria
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset + 73.5, w - margin, yOffset + 73.5);

  // ---------- Concepto ----------
  doc.setFont('helvetica', 'bold');
  doc.text('en concepto de:', margin, yOffset + 78);
  
  doc.setFont('helvetica', 'normal');
  const conceptLines = doc.splitTextToSize((receipt.concept || '—').toUpperCase(), width);
  doc.text(conceptLines, margin, yOffset + 82.5);
  
  let currentY = yOffset + 82.5 + conceptLines.length * 4;

  if (receipt.notes) {
    const noteLines = doc.splitTextToSize((receipt.notes).toUpperCase(), width);
    doc.text(noteLines, margin, currentY);
    currentY += noteLines.length * 4;
  }

  // Línea divisoria fija antes del total
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset + 100, w - margin, yOffset + 100);

  // ---------- Moneda recibida / TOTAL ----------
  doc.setFont('helvetica', 'bold');
  doc.text('Moneda recibida:', margin, yOffset + 104);
  doc.text('TOTAL', w - margin, yOffset + 104, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const effectiveItems = items.length > 0 ? items : [{ amount: receipt.amount, currency: receipt.currency }];
  let iy = yOffset + 109;
  effectiveItems.forEach((it) => {
    const spacing = effectiveItems.length > 3 ? 3 : 4.5;
    if (iy < yOffset + 120) {
      const currencyName = getCurrencyName(it.currency);
      const formattedAmount = it.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      doc.text(`${currencyName}  ${formattedAmount}`, margin, iy);
      doc.text(`${getCurrencySymbol(it.currency)}:  ${formattedAmount}`, w - margin, iy, { align: 'right' });
      iy += spacing;
    }
  });

  // Línea divisoria
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset + 122, w - margin, yOffset + 122);

  // Signatures only drawn for classic layouts
  if (!isVicka) {
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

    // Línea decorativa del pie del recibo para clásico
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
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

  // Carga optimizada con caché del logo y del banner de la agencia
  const logoDetails = await loadImageDetails(agency.logo_url);
  const bannerDetails = await loadImageDetails(agency.receipt_header_image_url || '');

  const effectiveItems: ReceiptItem[] = items.length > 0
    ? items
    : [{
        amount: receipt.amount,
        currency: receipt.currency,
        payment_method: receipt.payment_method,
      }];

  // Dibujar copia de la Agencia
  drawReceipt(doc, receipt, agency, 0, logoDetails, 'COPIA AGENCIA', effectiveItems, extraDetails, bannerDetails);

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
  drawReceipt(doc, receipt, agency, halfHeight, logoDetails, 'COPIA CLIENTE', effectiveItems, extraDetails, bannerDetails);

  doc.save(`Recibo-${String(receipt.receipt_number).padStart(6, '0')}.pdf`);
}
