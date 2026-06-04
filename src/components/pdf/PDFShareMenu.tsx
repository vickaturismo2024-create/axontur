import { Quote, Template } from '@/types/quote';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Share2, Mail, MessageCircle, Download, Printer, Link2, Check, Clock, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { generatePDF, generatePDFBlob } from '@/lib/generatePDF';
import { exportQuoteToExcel } from '@/lib/exportExcel';
import { normalizePhoneForWhatsApp, buildWhatsAppUrl } from '@/lib/birthdayTemplate';
import { useSettingsSafe } from '@/contexts/SettingsContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const getShareUrl = () => `${window.location.origin}/pdf/${quote.id}?download=true`;

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
  
  // The WhatsApp text message NO longer contains the sharing link as requested by the user.
  const whatsappMessage = `¡Hola ${quote.client.name}! 👋\n\nTe comparto tu presupuesto de viaje a *${quote.trip.destination}* 🌍✈️\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos!`;
  const whatsappUrl = phoneValidForWhatsApp ? buildWhatsAppUrl(phoneDigits, whatsappMessage) : null;

  const handleInvalidWhatsApp = () => {
    toast.error('El cliente no tiene un teléfono válido para WhatsApp', {
      description: 'Verificá el teléfono del cliente o el código de país por defecto en Ajustes → Notificaciones.',
    });
  };

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    let active = true;
    if (whatsappDialogOpen && !pdfBlob && pdfContainerSelector) {
      generatePDFBlob(pdfContainerSelector)
        .then(blob => {
          if (active) setPdfBlob(blob);
        })
        .catch(err => {
          console.error(err);
          if (active) {
            toast.error('Error al generar el PDF adjunto');
            setWhatsappDialogOpen(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [whatsappDialogOpen, pdfContainerSelector]);

  const handleSendWhatsAppAction = async () => {
    if (!pdfBlob) return;
    const filename = `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}.pdf`;
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    setWhatsappDialogOpen(false);
    setPdfBlob(null);

    // If browser supports Web Share API with file sharing (e.g. mobile iOS/Android)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Presupuesto a ${quote.trip.destination}`,
          text: whatsappMessage,
        });
        toast.success('Presupuesto compartido con éxito');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e);
          toast.error('Error al compartir. Descargando PDF...');
          downloadPDFAndOpenWhatsApp(pdfBlob, filename);
        }
      }
    } else {
      downloadPDFAndOpenWhatsApp(pdfBlob, filename);
    }
  };

  const downloadPDFAndOpenWhatsApp = (blob: Blob, filename: string) => {
    if (!whatsappUrl) return;
    // Download PDF file
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    // Open WhatsApp Chat
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('PDF descargado. Adjuntalo en el chat de WhatsApp.');
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
    <>
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
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              if (!phoneValidForWhatsApp) {
                handleInvalidWhatsApp();
              } else {
                setWhatsappDialogOpen(true);
              }
            }} 
            className="gap-2 cursor-pointer"
          >
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

      <Dialog open={whatsappDialogOpen} onOpenChange={(open) => {
        setWhatsappDialogOpen(open);
        if (!open) setPdfBlob(null);
      }}>
        <DialogContent className="max-w-md border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 animate-pulse">
                <MessageCircle className="h-5 w-5" />
              </span>
              Compartir por WhatsApp
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
              Envía el presupuesto al cliente directamente por WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            {!pdfBlob ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <MessageCircle className="h-5 w-5 text-emerald-500 absolute animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Generando PDF adjunto...</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-sans">Esto puede demorar unos segundos</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                {/* PDF File Card */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                    <Download className="h-5 w-5 animate-bounce" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-sans">Documento Listo</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate mt-0.5 font-mono text-xs">
                      presupuesto-{quote.trip.destination.replace(/\s+/g, '-')}.pdf
                    </p>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-sans">Mensaje a enviar</span>
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-900/30 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans relative">
                    <div className="whitespace-pre-wrap">{whatsappMessage}</div>
                  </div>
                </div>

                {/* Info Note for desktop */}
                {!isMobile() && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-600 dark:text-amber-400 leading-relaxed font-sans">
                    <strong>Nota:</strong> El PDF se descargará automáticamente. Por favor adjuntalo en el chat de WhatsApp que se abrirá.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setWhatsappDialogOpen(false);
                setPdfBlob(null);
              }}
              className="mt-2 sm:mt-0"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendWhatsAppAction}
              disabled={!pdfBlob}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium shadow-lg shadow-emerald-600/15"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar a WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
