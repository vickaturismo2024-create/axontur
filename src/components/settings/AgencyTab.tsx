import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { Save, CreditCard, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, UserSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FIELDS: (keyof UserSettings)[] = ['agency_name', 'cuit', 'phone', 'email', 'address', 'website', 'logo_url'];

interface CardRecord {
  id: string;
  alias: string;
  banco: string | null;
  vencimiento: string | null;
  ultimos_4: string | null;
  nro_tarjeta: string | null;
}

export function AgencyTab() {
  const { settings, updateSettings } = useSettings();
  const { agencyId } = useAuth();
  const [local, setLocal] = useState(() => Object.fromEntries(FIELDS.map(f => [f, settings[f] as string])) as Record<string, string>);
  const [saving, setSaving] = useState(false);

  // Cards state
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null);
  const [cardForm, setCardForm] = useState({
    alias: '',
    banco: '',
    vencimiento: '',
    ultimos_4: '',
    nro_tarjeta: '',
  });

  useEffect(() => {
    setLocal(Object.fromEntries(FIELDS.map(f => [f, settings[f] as string])) as Record<string, string>);
  }, [settings]);

  const loadCards = async () => {
    if (!agencyId) return;
    setCardsLoading(true);
    try {
      const { data } = await supabase
        .from('agency_cards')
        .select('*')
        .eq('agency_id', agencyId)
        .order('alias');
      setCards((data as unknown as CardRecord[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCardsLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      loadCards();
    }
  }, [agencyId]);

  const u = (k: string, v: string) => setLocal(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(local as Partial<UserSettings>);
      toast.success('Datos de agencia guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openNewCard = () => {
    setEditingCard(null);
    setCardForm({
      alias: '',
      banco: '',
      vencimiento: '',
      ultimos_4: '',
      nro_tarjeta: '',
    });
    setCardDialogOpen(true);
  };

  const openEditCard = (card: CardRecord) => {
    setEditingCard(card);
    setCardForm({
      alias: card.alias,
      banco: card.banco || '',
      vencimiento: card.vencimiento || '',
      ultimos_4: card.ultimos_4 || '',
      nro_tarjeta: card.nro_tarjeta || '',
    });
    setCardDialogOpen(true);
  };

  const saveCard = async () => {
    if (!agencyId) return;
    if (!cardForm.alias.trim()) {
      toast.error('El alias es obligatorio');
      return;
    }

    const payload = {
      alias: cardForm.alias.trim(),
      banco: cardForm.banco.trim() || null,
      vencimiento: cardForm.vencimiento.trim() || null,
      ultimos_4: cardForm.ultimos_4.trim() || null,
      nro_tarjeta: cardForm.nro_tarjeta.trim() || null,
    };

    try {
      if (editingCard) {
        const { error } = await supabase
          .from('agency_cards')
          .update(payload)
          .eq('id', editingCard.id);
        if (error) throw error;
        toast.success('Tarjeta actualizada');
      } else {
        const { error } = await supabase
          .from('agency_cards')
          .insert({
            ...payload,
            agency_id: agencyId,
          });
        if (error) throw error;
        toast.success('Tarjeta agregada');
      }
      setCardDialogOpen(false);
      loadCards();
    } catch (e) {
      toast.error('Error al guardar la tarjeta');
      console.error(e);
    }
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta tarjeta?')) return;
    try {
      const { error } = await supabase
        .from('agency_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Tarjeta eliminada');
      loadCards();
    } catch (e) {
      toast.error('Error al eliminar la tarjeta');
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Nombre de la agencia</Label>
          <Input value={local.agency_name} onChange={(e) => u('agency_name', e.target.value)} placeholder="Mi Agencia de Viajes" />
        </div>
        <div>
          <Label>CUIT / Identificación fiscal</Label>
          <Input value={local.cuit} onChange={(e) => u('cuit', e.target.value)} placeholder="20-12345678-9" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Teléfono</Label>
            <Input value={local.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={local.email} onChange={(e) => u('email', e.target.value)} placeholder="info@miagencia.com" />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input value={local.address} onChange={(e) => u('address', e.target.value)} placeholder="Av. Corrientes 1234, CABA" />
        </div>
        <div>
          <Label>Sitio web</Label>
          <Input value={local.website} onChange={(e) => u('website', e.target.value)} placeholder="https://www.miagencia.com" />
        </div>
        <ImageUpload
          label="Logo de la agencia"
          value={local.logo_url}
          onChange={(v) => u('logo_url', v)}
          placeholder="https://ejemplo.com/logo.png"
          previewClassName="h-20"
        />
        <Button onClick={save} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </Button>
      </div>

      <hr className="my-6 border-border" />

      {/* Sección de Tarjetas de la Agencia */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Tarjetas de la Agencia
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administrá las tarjetas corporativas para pagos a operadores.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openNewCard} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Agregar Tarjeta
          </Button>
        </div>

        {cardsLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Cargando tarjetas...</div>
        ) : cards.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            No hay tarjetas registradas para esta agencia.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Alias</TableHead>
                  <TableHead className="text-xs">Banco</TableHead>
                  <TableHead className="text-xs">Vencimiento</TableHead>
                  <TableHead className="text-xs">Últimos 4</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium text-xs">{card.alias}</TableCell>
                    <TableCell className="text-xs">{card.banco || '—'}</TableCell>
                    <TableCell className="text-xs">{card.vencimiento || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{card.ultimos_4 ? `**** ${card.ultimos_4}` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCard(card)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCard(card.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Diálogo de Tarjeta */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? 'Editar Tarjeta de Agencia' : 'Nueva Tarjeta de Agencia'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="card-alias" className="text-xs">Alias (Nombre descriptivo) *</Label>
              <Input
                id="card-alias"
                placeholder="Ej: Visa Corporate, Amex Agencia"
                value={cardForm.alias}
                onChange={(e) => setCardForm(p => ({ ...p, alias: e.target.value }))}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="card-bank" className="text-xs">Banco</Label>
                <Input
                  id="card-bank"
                  placeholder="Ej: Galicia, Santander"
                  value={cardForm.banco}
                  onChange={(e) => setCardForm(p => ({ ...p, banco: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="card-expiry" className="text-xs">Vencimiento</Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/AA"
                  value={cardForm.vencimiento}
                  onChange={(e) => setCardForm(p => ({ ...p, vencimiento: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="card-last4" className="text-xs">Últimos 4 dígitos</Label>
                <Input
                  id="card-last4"
                  placeholder="Ej: 1234"
                  maxLength={4}
                  value={cardForm.ultimos_4}
                  onChange={(e) => setCardForm(p => ({ ...p, ultimos_4: e.target.value.replace(/\D/g, '') }))}
                  className="text-xs font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="card-number" className="text-xs">Número completo (Opcional)</Label>
                <Input
                  id="card-number"
                  placeholder="Número de tarjeta"
                  value={cardForm.nro_tarjeta}
                  onChange={(e) => setCardForm(p => ({ ...p, nro_tarjeta: e.target.value }))}
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <Button onClick={saveCard} className="w-full mt-2 text-xs">
              <Save className="mr-2 h-4 w-4" />
              {editingCard ? 'Guardar Cambios' : 'Agregar Tarjeta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
