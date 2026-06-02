import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Mail, Phone, Calendar, User, FileText, CheckCircle, ShieldAlert, AlertTriangle, MessageSquare, Clipboard } from 'lucide-react';
import { ClientRecord } from './ClientFormDialog';
import { getDocStatus } from './DocumentAlertBadge';
import { toast } from 'sonner';

interface ClientInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  onEdit?: () => void;
}

export function ClientInfoDialog({ open, onOpenChange, client, onEdit }: ClientInfoDialogProps) {
  if (!client) return null;

  const dniStatus = getDocStatus(client.dni_expiry);
  const passportStatus = getDocStatus(client.passport_expiry);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="ml-2 animate-pulse text-[10px] px-1.5 font-bold">VENCIDO</Badge>;
      case 'expiring':
        return <Badge variant="warning" className="ml-2 text-[10px] px-1.5 font-bold bg-amber-500 text-white">POR VENCER</Badge>;
      default:
        return <Badge variant="outline" className="ml-2 text-[10px] px-1.5 font-bold bg-emerald-500/10 text-emerald-600 border-0">VIGENTE</Badge>;
    }
  };

  const infoRow = (label: string, value: string | undefined | null, copyLabel?: string) => {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border/40 hover:bg-muted/10 px-1.5 rounded-lg transition-colors group">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <span className="text-sm font-bold text-foreground truncate max-w-[250px] sm:max-w-xs">{value}</span>
          {copyLabel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80"
              onClick={() => copyToClipboard(value, copyLabel)}
              title={`Copiar ${copyLabel}`}
            >
              <Clipboard className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mx-auto rounded-2xl max-h-[90vh] overflow-y-auto scrollbar-thin shadow-premium">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold flex items-center justify-center font-bold text-lg shrink-0">
              {initials || <User className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold text-foreground tracking-tight leading-none truncate">{client.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                {client.locality && <><MapPin className="h-3 w-3 inline text-slate-500" /> {client.locality}</>}
                {client.locality && client.nationality && <span>•</span>}
                {client.nationality && <span>{client.nationality}</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Datos Personales */}
          <div>
            <h3 className="text-xs font-bold text-primary dark:text-gold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4" /> Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {infoRow('Dirección', client.address, 'Dirección')}
              {infoRow('Localidad', client.locality)}
              {infoRow('Nacionalidad', client.nationality)}
              {infoRow('Nacimiento', client.birth_date)}
              {infoRow('Sexo', client.sex)}
              {infoRow('CUIL/CUIT', client.cuil_cuit, 'CUIL/CUIT')}
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-xs font-bold text-primary dark:text-gold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Información de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {infoRow('Email', client.email, 'Email')}
              {infoRow('Teléfono Fijo', client.phone, 'Teléfono')}
              {infoRow('Celular', client.phone_mobile, 'Celular')}
              {infoRow('Teléfono Laboral', client.phone_work, 'Teléfono Laboral')}
            </div>
          </div>

          {/* Documentos */}
          <div>
            <h3 className="text-xs font-bold text-primary dark:text-gold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Documentos de Viaje
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {client.dni && (
                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground">DNI</span>
                    {client.dni_expiry && getStatusBadge(dniStatus)}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground font-medium">
                    <span>Número: <strong className="text-foreground ml-1">{client.dni}</strong></span>
                    {client.dni_expiry && <span>Vto: <strong className="text-foreground ml-1">{client.dni_expiry}</strong></span>}
                  </div>
                </div>
              )}
              {client.passport && (
                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground">PASAPORTE</span>
                    {client.passport_expiry && getStatusBadge(passportStatus)}
                  </div>
                  <div className="flex flex-col gap-1 text-xs mt-2 text-muted-foreground font-medium">
                    <div className="flex items-center justify-between">
                      <span>Número: <strong className="text-foreground ml-1">{client.passport}</strong></span>
                      {client.passport_issue && <span>Emisión: <strong className="text-foreground ml-1">{client.passport_issue}</strong></span>}
                    </div>
                    {client.passport_expiry && (
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/30">
                        <span>Vencimiento:</span>
                        <strong className="text-foreground">{client.passport_expiry}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!client.dni && !client.passport && (
                <p className="text-xs text-muted-foreground italic col-span-2">No se registraron documentos para este cliente.</p>
              )}
            </div>
          </div>

          {/* Notas */}
          {client.notes && (
            <div className="p-4 bg-primary/5 dark:bg-gold/5 border border-primary/10 dark:border-gold/10 rounded-2xl">
              <h4 className="text-xs font-bold text-primary dark:text-gold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Notas Privadas
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-line">
                "{client.notes}"
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl px-4">
            Cerrar
          </Button>
          {onEdit && (
            <Button size="sm" onClick={() => { onOpenChange(false); onEdit(); }} className="rounded-xl px-4 bg-primary hover:bg-primary/95 text-primary-foreground dark:bg-gold dark:text-background dark:hover:bg-gold/90 font-semibold">
              Editar Cliente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
