import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

interface FileDetailEmailDialogsProps {
  fileLabel: string;
  confirmEmailOpen: boolean;
  setConfirmEmailOpen: (open: boolean) => void;
  clientEmail: string;
  setClientEmail: (email: string) => void;
  sendingEmail: boolean;
  handleSendConfirmation: () => void;
  
  voucherEmailOpen: boolean;
  setVoucherEmailOpen: (open: boolean) => void;
  voucherSupplier: string;
  setVoucherSupplier: (supplier: string) => void;
  voucherEmail: string;
  setVoucherEmail: (email: string) => void;
  handleSendVoucher: () => void;
}

export function FileDetailEmailDialogs({
  fileLabel,
  confirmEmailOpen,
  setConfirmEmailOpen,
  clientEmail,
  setClientEmail,
  sendingEmail,
  handleSendConfirmation,
  
  voucherEmailOpen,
  setVoucherEmailOpen,
  voucherSupplier,
  setVoucherSupplier,
  voucherEmail,
  setVoucherEmail,
  handleSendVoucher,
}: FileDetailEmailDialogsProps) {
  return (
    <>
      {/* Diálogo: Confirmación al cliente */}
      <Dialog open={confirmEmailOpen} onOpenChange={setConfirmEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar confirmación al cliente</DialogTitle>
            <DialogDescription>
              Se enviará un email con los datos del expediente {fileLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="client-email">Email del cliente</Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEmailOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendConfirmation} disabled={sendingEmail || !clientEmail}>
              <Send className="mr-2 h-4 w-4" />{sendingEmail ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Voucher a operador */}
      <Dialog open={voucherEmailOpen} onOpenChange={setVoucherEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar voucher a operador</DialogTitle>
            <DialogDescription>
              Se enviará un voucher con los datos del servicio del expediente {fileLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="voucher-supplier">Nombre del operador</Label>
              <Input
                id="voucher-supplier"
                value={voucherSupplier}
                onChange={e => setVoucherSupplier(e.target.value)}
                placeholder="Operador / Mayorista"
              />
            </div>
            <div>
              <Label htmlFor="voucher-email">Email del operador</Label>
              <Input
                id="voucher-email"
                type="email"
                value={voucherEmail}
                onChange={e => setVoucherEmail(e.target.value)}
                placeholder="operador@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherEmailOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendVoucher} disabled={sendingEmail || !voucherEmail || !voucherSupplier}>
              <Send className="mr-2 h-4 w-4" />{sendingEmail ? 'Enviando...' : 'Enviar voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
