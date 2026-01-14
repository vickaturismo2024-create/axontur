import { Quote } from '@/types/quote';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Mail, MessageCircle, Download, Printer, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PDFShareMenuProps {
  quote: Quote;
  onPrint: () => void;
}

export function PDFShareMenu({ quote, onPrint }: PDFShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    return `${window.location.origin}/pdf/${quote.id}`;
  };

  const getShareText = () => {
    return `Presupuesto de viaje a ${quote.trip.destination} para ${quote.client.name}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Presupuesto de viaje - ${quote.trip.destination}`);
    const body = encodeURIComponent(
      `Hola ${quote.client.name},\n\n` +
      `Te comparto tu presupuesto de viaje a ${quote.trip.destination}.\n\n` +
      `Puedes verlo en el siguiente enlace:\n${getShareUrl()}\n\n` +
      `Saludos,\nVicka Turismo`
    );
    window.open(`mailto:${quote.client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hola ${quote.client.name}! 👋\n\n` +
      `Te comparto tu presupuesto de viaje a *${quote.trip.destination}* 🌍✈️\n\n` +
      `🔗 Ver presupuesto: ${getShareUrl()}\n\n` +
      `Si tienes alguna pregunta, ¡no dudes en escribirnos!`
    );
    window.open(`https://wa.me/${quote.client.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const handleDownload = () => {
    // Trigger print which allows saving as PDF
    onPrint();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartir
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareEmail} className="gap-2 cursor-pointer">
          <Mail className="h-4 w-4" />
          Enviar por Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2 cursor-pointer">
          <MessageCircle className="h-4 w-4 text-green-600" />
          Enviar por WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Descargar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrint} className="gap-2 cursor-pointer">
          <Printer className="h-4 w-4" />
          Imprimir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
