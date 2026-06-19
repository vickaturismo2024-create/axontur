import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail } from 'lucide-react';
import { Receipt } from './types';

interface EmailReceiptDialogProps {
  receipt: Receipt | null;
  emailTo: string;
  setEmailTo: (v: string) => void;
  emailIncludeBreakdown: boolean;
  setEmailIncludeBreakdown: (v: boolean) => void;
  emailSending: boolean;
  onSend: () => void;
  onOpenChange: (open: boolean) => void;
}

export function EmailReceiptDialog({
  receipt,
  emailTo,
  setEmailTo,
  emailIncludeBreakdown,
  setEmailIncludeBreakdown,
  emailSending,
  onSend,
  onOpenChange,
}: EmailReceiptDialogProps) {
  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar recibo por email</DialogTitle>
          <DialogDescription className="sr-only">Formulario para enviar recibo por email</DialogDescription>
        </DialogHeader>
        {receipt && (
          <div className="grid gap-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">REC-{String(receipt.receipt_number).padStart(4, '0')}</p>
              <p className="text-muted-foreground">{receipt.concept}</p>
              <p className="text-muted-foreground">
                {receipt.currency} {receipt.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Destinatario *</label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-breakdown"
                checked={emailIncludeBreakdown}
                onCheckedChange={(v) => setEmailIncludeBreakdown(!!v)}
              />
              <label htmlFor="include-breakdown" className="text-sm cursor-pointer">
                Incluir desglose de líneas en el cuerpo
              </label>
            </div>
            <Button onClick={onSend} disabled={emailSending}>
              <Mail className="mr-2 h-4 w-4" />
              {emailSending ? 'Enviando...' : 'Enviar email'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
