import { Quote, Template } from '@/types/quote';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Share2, Mail, MessageCircle, Download, Printer, Link2, Check, Clock, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generatePDF } from '@/lib/generatePDF';
import { exportQuoteToExcel } from '@/lib/exportExcel';

interface PDFShareMenuProps {
  quote: Quote;
  template?: Template;
  onPrint: () => void;
  onSetExpiry?: (expiry: string | undefined) => void;
  pdfContainerSelector?: string;
}

export function PDFShareMenu({ quote, template, onPrint, onSetExpiry, pdfContainerSelector }: PDFShareMenuProps) {
  const agencyName = template?.agencyName || template?.name || 'Mi Agencia';
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getShareUrl = () => `${window.location.origin}/pdf/${quote.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Error al copiar el enlace'); }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Presupuesto de viaje - ${quote.trip.destination}`);
    const body = encodeURIComponent(
      `Hola ${quote.client.name},\n\nTe comparto tu presupuesto de viaje a ${quote.trip.destination}.\n\nPuedes verlo en el siguiente enlace:\n${getShareUrl()}\n\nSaludos,\n${agencyName}`
    );
    window.open(`mailto:${quote.client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hola ${quote.client.name}! 👋\n\nTe comparto tu presupuesto de viaje a *${quote.trip.destination}* 🌍✈️\n\n🔗 Ver presupuesto: ${getShareUrl()}\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos!`
    );
    window.open(`https://wa.me/${quote.client.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const setExpiry = (hours: number | null) => {
    if (!onSetExpiry) return;
    if (hours === null) {
      onSetExpiry(undefined);
      toast.success('El enlace ya no tiene vencimiento');
    } else {
      const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      onSetExpiry(expiry);
      toast.success(`El enlace vencerá en ${hours >= 24 ? `${hours / 24} días` : `${hours} horas`}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" />Compartir</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareEmail} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4" />Enviar por Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2 cursor-pointer">
          <MessageCircle className="h-4 w-4 text-green-600" />Enviar por WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          if (!pdfContainerSelector) { onPrint(); return; }
          setDownloading(true);
          try {
            await generatePDF(pdfContainerSelector, `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}.pdf`);
            toast.success('PDF descargado');
          } catch (e) {
            console.error(e);
            toast.error('Error al generar el PDF, usando impresión');
            onPrint();
          } finally { setDownloading(false); }
        }} className="gap-2 cursor-pointer" disabled={downloading}>
          <Download className="h-4 w-4" />{downloading ? 'Generando...' : 'Descargar PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint} className="gap-2 cursor-pointer">
          <Printer className="h-4 w-4" />Imprimir
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { try { exportQuoteToExcel(quote); toast.success('Excel descargado'); } catch { toast.error('Error al exportar'); } }} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />Exportar a Excel
        </DropdownMenuItem>
        {onSetExpiry && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setExpiry(24)} className="gap-2 cursor-pointer">
              <Clock className="h-4 w-4" />Vence en 24 horas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExpiry(168)} className="gap-2 cursor-pointer">
              <Clock className="h-4 w-4" />Vence en 7 días
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExpiry(720)} className="gap-2 cursor-pointer">
              <Clock className="h-4 w-4" />Vence en 30 días
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExpiry(null)} className="gap-2 cursor-pointer">
              <Clock className="h-4 w-4" />Sin vencimiento
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
