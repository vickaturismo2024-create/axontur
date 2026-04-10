import { ClientNotes } from '@/components/clients/ClientNotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone_work: string;
  phone_mobile: string;
  notes: string;
  address: string;
  nationality: string;
  birth_date: string;
  dni: string;
  dni_expiry: string;
  passport: string;
  passport_issue: string;
  passport_expiry: string;
  locality: string;
  cuil_cuit: string;
  sex: string;
}

export const emptyClient: Omit<ClientRecord, 'id'> = {
  name: '', email: '', phone: '', phone_work: '', phone_mobile: '', notes: '',
  address: '', nationality: '', birth_date: '', dni: '', dni_expiry: '',
  passport: '', passport_issue: '', passport_expiry: '', locality: '', cuil_cuit: '', sex: '',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientRecord | null;
  onClientChange: (c: ClientRecord) => void;
  onSave: () => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onClientChange, onSave }: Props) {
  if (!client) return null;
  const upd = (field: keyof ClientRecord, value: string) => onClientChange({ ...client, [field]: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client.id ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="contact">Contacto</TabsTrigger>
            <TabsTrigger value="notes" disabled={!client.id}>Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo</Label>
                <Input value={client.name} onChange={(e) => upd('name', e.target.value)} placeholder="Apellido Nombre" />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={client.sex} onValueChange={(v) => upd('sex', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="X">No binario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={client.birth_date} onChange={(e) => upd('birth_date', e.target.value)} />
              </div>
              <div>
                <Label>Nacionalidad</Label>
                <Input value={client.nationality} onChange={(e) => upd('nationality', e.target.value)} placeholder="Argentina" />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={client.notes} onChange={(e) => upd('notes', e.target.value)} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>DNI</Label>
                <Input value={client.dni} onChange={(e) => upd('dni', e.target.value)} placeholder="12345678" />
              </div>
              <div>
                <Label>Vto. DNI</Label>
                <Input type="date" value={client.dni_expiry} onChange={(e) => upd('dni_expiry', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Pasaporte</Label>
                <Input value={client.passport} onChange={(e) => upd('passport', e.target.value)} placeholder="AAA123456" />
              </div>
              <div>
                <Label>Emisión</Label>
                <Input type="date" value={client.passport_issue} onChange={(e) => upd('passport_issue', e.target.value)} />
              </div>
              <div>
                <Label>Vencimiento</Label>
                <Input type="date" value={client.passport_expiry} onChange={(e) => upd('passport_expiry', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>CUIL/CUIT</Label>
              <Input value={client.cuil_cuit} onChange={(e) => upd('cuil_cuit', e.target.value)} placeholder="20-12345678-9" />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={client.email} onChange={(e) => upd('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tel. Particular</Label>
                <Input value={client.phone} onChange={(e) => upd('phone', e.target.value)} />
              </div>
              <div>
                <Label>Tel. Comercial</Label>
                <Input value={client.phone_work} onChange={(e) => upd('phone_work', e.target.value)} />
              </div>
              <div>
                <Label>Celular</Label>
                <Input value={client.phone_mobile} onChange={(e) => upd('phone_mobile', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dirección</Label>
                <Input value={client.address} onChange={(e) => upd('address', e.target.value)} />
              </div>
              <div>
                <Label>Localidad</Label>
                <Input value={client.locality} onChange={(e) => upd('locality', e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={!client.name}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
