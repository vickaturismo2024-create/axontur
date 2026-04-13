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
}

const METHODS: Record<string, string> = {
  transfer: 'Transferencia', credit_card: 'Tarjeta de Crédito', debit_card: 'Tarjeta de Débito',
  cash: 'Efectivo', check: 'Cheque', other: 'Otro',
};

export function generateReceiptPDF(receipt: Receipt, agency: Agency) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'Mi Agencia', w / 2, y, { align: 'center' });
  y += 8;

  if (agency.address || agency.phone || agency.cuit) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const parts = [agency.address, agency.phone, agency.cuit ? `CUIT: ${agency.cuit}` : '', agency.email].filter(Boolean);
    doc.text(parts.join(' | '), w / 2, y, { align: 'center' });
    y += 6;
  }

  // Line
  doc.setDrawColor(200);
  doc.line(15, y, w - 15, y);
  y += 10;

  // Receipt title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO', w / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(12);
  doc.text(`N° ${String(receipt.receipt_number).padStart(4, '0')}`, w / 2, y, { align: 'center' });
  y += 12;

  // Details
  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, y);
    y += 7;
  };

  addRow('Fecha:', new Date(receipt.payment_date).toLocaleDateString('es-AR'));
  addRow('Cliente:', receipt.client_name);
  addRow('Concepto:', receipt.concept);
  addRow('Método:', METHODS[receipt.payment_method] || receipt.payment_method);
  
  y += 5;
  doc.setDrawColor(200);
  doc.line(15, y, w - 15, y);
  y += 10;

  // Amount
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 20, y);
  doc.text(`${receipt.currency} ${receipt.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, w - 20, y, { align: 'right' });
  y += 12;

  if (receipt.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Observaciones: ${receipt.notes}`, 20, y);
    y += 10;
  }

  // Footer line
  y = 250;
  doc.setDrawColor(200);
  doc.line(20, y, 90, y);
  doc.line(w - 90, y, w - 20, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Agencia', 55, y, { align: 'center' });
  doc.text('Firma Cliente', w - 55, y, { align: 'center' });

  doc.save(`Recibo-${String(receipt.receipt_number).padStart(4, '0')}.pdf`);
}
