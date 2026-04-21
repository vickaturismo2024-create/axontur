/**
 * Exporta extractos de cuenta corriente a Excel y PDF.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StatementMovement {
  date: string;
  concept: string;
  reference?: string | null;
  fileNumber?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementHeader {
  accountName: string;
  accountType: 'client' | 'supplier';
  currency: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface AgencyHeader {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  cuit?: string;
  logoUrl?: string;
  footerLegal?: string;
}

const fmt = (n: number) =>
  n === 0 ? '-' : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('es-AR');
  } catch {
    return d;
  }
};

export function exportStatementExcel(
  header: StatementHeader,
  movements: StatementMovement[],
  agency: AgencyHeader,
) {
  const wb = XLSX.utils.book_new();

  const meta: any[][] = [
    [agency.name || 'Agencia'],
    [`Extracto de Cuenta Corriente — ${header.accountType === 'client' ? 'Cliente' : 'Proveedor'}`],
    [`Titular: ${header.accountName}`],
    [`Moneda: ${header.currency}`],
    [
      `Período: ${header.periodFrom ? fmtDate(header.periodFrom) : 'Inicio'} al ${header.periodTo ? fmtDate(header.periodTo) : 'Hoy'}`,
    ],
    [],
    ['Fecha', 'Concepto', 'Referencia', 'Expediente', 'Debe', 'Haber', 'Saldo'],
  ];

  movements.forEach(m => {
    meta.push([
      fmtDate(m.date),
      m.concept,
      m.reference || '',
      m.fileNumber || '',
      m.debit || 0,
      m.credit || 0,
      m.balance,
    ]);
  });

  const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;
  meta.push([]);
  meta.push(['', '', '', '', '', 'Saldo final:', finalBalance]);

  const ws = XLSX.utils.aoa_to_sheet(meta);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Extracto');
  const filename = `extracto-${header.accountName.replace(/\s+/g, '_')}-${header.currency}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportStatementPDF(
  header: StatementHeader,
  movements: StatementMovement[],
  agency: AgencyHeader,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Encabezado de agencia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(agency.name || 'Agencia', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const agencyLines = [agency.address, agency.phone, agency.email, agency.cuit ? `CUIT: ${agency.cuit}` : '']
    .filter(Boolean)
    .join('  ·  ');
  if (agencyLines) {
    doc.text(agencyLines, 14, y);
    y += 5;
  }

  // Título extracto
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    `Extracto de Cuenta Corriente — ${header.accountType === 'client' ? 'Cliente' : 'Proveedor'}`,
    14,
    y,
  );
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Titular: ${header.accountName}`, 14, y);
  y += 5;
  doc.text(`Moneda: ${header.currency}`, 14, y);
  y += 5;
  doc.text(
    `Período: ${header.periodFrom ? fmtDate(header.periodFrom) : 'Inicio'} al ${header.periodTo ? fmtDate(header.periodTo) : 'Hoy'}`,
    14,
    y,
  );
  y += 4;

  // Tabla de movimientos
  autoTable(doc, {
    startY: y + 2,
    head: [['Fecha', 'Concepto', 'Ref.', 'Exp.', 'Debe', 'Haber', 'Saldo']],
    body: movements.map(m => [
      fmtDate(m.date),
      m.concept,
      m.reference || '',
      m.fileNumber || '',
      fmt(m.debit),
      fmt(m.credit),
      fmt(m.balance),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 20 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
  const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Saldo final: ${header.currency} ${fmt(finalBalance)}`, pageWidth - 14, finalY + 8, {
    align: 'right',
  });

  // Footer legal
  if (agency.footerLegal) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(agency.footerLegal, 14, pageHeight - 10, { maxWidth: pageWidth - 28 });
  }

  const filename = `extracto-${header.accountName.replace(/\s+/g, '_')}-${header.currency}.pdf`;
  doc.save(filename);
}
