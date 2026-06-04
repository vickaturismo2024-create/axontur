import { Quote, Template } from '@/types/quote';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Share2, Mail, MessageCircle, Download, Printer, Link2, Check, Clock, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { generatePDF, generatePDFBlob } from '@/lib/generatePDF';
import { exportQuoteToExcel } from '@/lib/exportExcel';
import { normalizePhoneForWhatsApp, buildWhatsAppUrl } from '@/lib/birthdayTemplate';
import { useSettingsSafe } from '@/contexts/SettingsContext';

interface PDFShareMenuProps {
  quote: Quote;
  template?: Template;
  onPrint: () => void;
  onSetExpiry?: (expiry: string | undefined) => void;
  pdfContainerSelector?: string;
}

export function PDFShareMenu({ quote, template, onPrint, onSetExpiry, pdfContainerSelector }: PDFShareMenuProps) {
  const agencyName = template?.agencyName || template?.name || 'Mi Agencia';
  const settingsCtx = useSettingsSafe();
  const defaultCountryCode = settingsCtx?.settings.birthday_whatsapp_country_code || '54';
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Return the production Vercel URL when testing on localhost so that the shared link actually works for clients!
  const getShareUrl = () => {
    const origin = window.location.origin.includes('localhost')
      ? 'https://axontur.vercel.app'
      : window.location.origin;
    return `${origin}/pdf/${quote.id}?download=true`;
  };

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

  const phoneDigits = normalizePhoneForWhatsApp(quote.client.phone || '', defaultCountryCode);
  const phoneValidForWhatsApp = phoneDigits.length >= 8 && phoneDigits.length <= 15;

  const handleInvalidWhatsApp = () => {
    toast.error('El cliente no tiene un teléfono válido para WhatsApp', {
      description: 'Verificá el teléfono del cliente o el código de país por defecto en Ajustes → Notificaciones.',
    });
  };

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShareWhatsApp = async () => {
    if (!phoneValidForWhatsApp) {
      handleInvalidWhatsApp();
      return;
    }

    if (!pdfContainerSelector) {
      toast.error('No se puede generar el PDF desde esta pantalla.');
      return;
    }

    const isMob = isMobile();
    let newWindow: Window | null = null;

    // To prevent browser popup blockers on PC, we pre-open a blank tab synchronously
    if (!isMob) {
      newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write('<p style="font-family: sans-serif; text-align: center; margin-top: 20px;">Abriendo WhatsApp y preparando PDF...</p>');
      }
    }

    const toastId = toast.loading('Generando PDF presupuesto...');

    try {
      const blob = await generatePDFBlob(pdfContainerSelector);
      const filename = `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      // WhatsApp text message without link as requested for manual attachment flow on PC / native share on mobile
      const whatsappMessage = `¡Hola ${quote.client.name}! 👋\n\nTe comparto tu presupuesto de viaje a *${quote.trip.destination}* 🌍✈️\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos!`;
      const whatsappUrl = buildWhatsAppUrl(phoneDigits, whatsappMessage);

      // On mobile devices, use the native browser sharing to attach the actual PDF directly to WhatsApp
      if (isMob && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [file],
          title: `Presupuesto a ${quote.trip.destination}`,
          text: whatsappMessage,
        });
      } else {
        // Fallback for PC: trigger PDF download locally
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Redirect the pre-opened window to WhatsApp
        if (newWindow) {
          newWindow.location.href = whatsappUrl;
        } else {
          window.open(whatsappUrl, '_blank');
        }

        toast.success('PDF descargado. Adjúntalo en el chat de WhatsApp que se acaba de abrir.', {
          id: toastId,
          duration: 6000,
        });
      }
    } catch (e: any) {
      console.error(e);
      if (newWindow) newWindow.close();

      // Absolute fallback if PDF generation fails
      const whatsappMessageFallback = `¡Hola ${quote.client.name}! 👋\n\nTe comparto tu presupuesto de viaje a *${quote.trip.destination}* 🌍✈️\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos!`;
      const whatsappUrlFallback = buildWhatsAppUrl(phoneDigits, whatsappMessageFallback);
      window.open(whatsappUrlFallback, '_blank');

      toast.error('Ocurrió un error al generar el PDF. Se abrió WhatsApp con el mensaje.', { id: toastId });
    }
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
        <DropdownMenuItem onClick={async () => { try { await exportQuoteToExcel(quote); toast.success('Excel descargado'); } catch { toast.error('Error al exportar'); } }} className="gap-2 cursor-pointer">
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
