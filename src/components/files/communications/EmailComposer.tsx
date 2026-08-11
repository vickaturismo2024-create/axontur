import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sendCustomCommunication } from '@/lib/emailService';

interface Passenger {
  id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  passport_number?: string;
  email?: string;
}

interface Props {
  fileId: string;
  fileNumber: string;
  clientEmail?: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function EmailComposer({ fileId, fileNumber, clientEmail, open, onClose, onSent }: Props) {
  const { user, agencyId: authAgencyId } = useAuth();
  const [to, setTo] = useState<string>(clientEmail || '');
  const [cc, setCc] = useState<string>('');
  const [subject, setSubject] = useState<string>(`[${fileNumber}] Novedades de tu viaje`);
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [passengers, setPassengers] = useState<Passenger[]>([]);


  useEffect(() => {
    if (open && fileId) {
      if (clientEmail) setTo(clientEmail);
      setSubject(`[${fileNumber}] Novedades de tu viaje`);
      loadFileData();
    }
  }, [open, fileId]);

  const loadFileData = async () => {
    // Load passengers
    const { data: pData } = await supabase
      .from('passengers')
      .select('*')
      .eq('file_id', fileId);
    if (pData) setPassengers(pData as any);
  };

  const handleInsertPassengerInfo = (p: Passenger) => {
    const textToInsert = `\n\nPasajero: ${p.first_name} ${p.last_name}\nDNI: ${p.dni || 'N/A'}\nPasaporte: ${p.passport_number || 'N/A'}\n`;
    setBody(prev => prev + textToInsert);
  };

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Debes ingresar al menos un destinatario');
      return;
    }
    if (!user || !authAgencyId) {
      toast.error('No se pudo determinar el usuario o agencia');
      return;
    }

    setSending(true);
    try {
      const toArray = to.split(',').map(s => s.trim()).filter(Boolean);
      const ccArray = cc.split(',').map(s => s.trim()).filter(Boolean);

      const res = await sendCustomCommunication({
        userId: user.id,
        agencyId: authAgencyId,
        fileId,
        to: toArray,
        cc: ccArray,
        subject,
        bodyHtml: body.replace(/\n/g, '<br/>'),
      });

      if (res.success) {
        toast.success('Correo enviado correctamente');
        onClose();
        if (onSent) onSent();
      } else {
        toast.error(`Error al enviar: ${res.error || 'Desconocido'}`);
      }
    } catch (e: any) {
      toast.error(`Error inesperado: ${e?.message || e}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Redactar correo — Expediente {fileNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Para (Separar con comas)</Label>
            <Input
              placeholder="cliente@email.com, operador@empresa.com"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">CC (Copia)</Label>
            <Input
              placeholder="copia@agencia.com"
              value={cc}
              onChange={e => setCc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Asunto</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Passenger data quick insert */}
          {passengers.length > 0 && (
            <div className="space-y-1 bg-muted/40 p-2.5 rounded-md text-xs">
              <span className="font-semibold flex items-center gap-1 mb-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Insertar datos de Pasajeros:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {passengers.map(p => (
                  <Badge
                    key={p.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                    onClick={() => handleInsertPassengerInfo(p)}
                  >
                    + {p.first_name} {p.last_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Mensaje</Label>
            <Textarea
              rows={8}
              placeholder="Escribe aquí el contenido de tu correo..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending}>
            <Send className="mr-1.5 h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar correo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
