import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Quote } from '@/types/quote';
import { toast } from 'sonner';

interface Props {
  quote: Quote;
}

export function CreateFileFromQuote({ quote }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);

    // Check if file already exists for this quote
    const { data: existing } = await supabase.from('files').select('id,file_number').eq('quote_id', quote.id).maybeSingle();
    if (existing) {
      toast.info(`Ya existe el expediente FILE-${String((existing as any).file_number).padStart(3, '0')}`);
      navigate(`/files/${(existing as any).id}`);
      setCreating(false);
      return;
    }

    // Build services from quote data
    const services: any[] = [];
    const addService = (type: string, desc: string, cost: number, price: number, date?: string, supplier?: string) => {
      services.push({ service_type: type, description: desc, cost, price, currency: quote.trip.currency || 'USD', service_date: date || null, supplier_name: supplier || '', status: 'pending', user_id: user.id });
    };

    (quote.flights || []).forEach(f => addService('flight', `${f.airline || ''} ${f.flightNumber || ''} ${f.origin}-${f.destination}`.trim(), f.cost || 0, f.price || 0, f.date, f.supplier));
    (quote.lodgings || []).forEach(l => addService('lodging', `${l.name} (${l.nights || 0} noches)`, (l.costPerNight || 0) * (l.nights || 1), (l.pricePerNight || 0) * (l.nights || 1), l.checkIn, l.supplier));
    (quote.transfers || []).forEach(t => addService('transfer', t.description || t.type || 'Traslado', t.cost || 0, t.price || 0, t.dateTime, t.supplier));
    (quote.activities || []).forEach(a => addService('activity', a.name || 'Actividad', a.cost || 0, a.price || 0, a.date, a.supplier));
    if (quote.insurance?.company) addService('insurance', `${quote.insurance.company} - ${quote.insurance.plan || ''}`, quote.insurance.cost || 0, quote.insurance.price || 0);
    if (quote.cruise?.shipName) addService('cruise', `${quote.cruise.shipName} ${quote.cruise.cabin || ''}`, quote.cruise.cost || 0, quote.cruise.price || 0, quote.cruise.embarkDate);

    const { data: fileData, error } = await supabase.from('files').insert({
      user_id: user.id,
      quote_id: quote.id,
      client_name: quote.client?.name || '',
      destination: quote.trip?.destination || '',
      start_date: quote.trip?.startDate || null,
      end_date: quote.trip?.endDate || null,
      travelers: quote.trip?.travelers || 1,
      currency: quote.trip?.currency || 'USD',
      total_price: quote.pricing?.totalPrice || 0,
      total_cost: quote.pricing?.totalCost || 0,
      status: 'confirmed',
    }).select('id,file_number').single();

    if (error || !fileData) {
      toast.error('Error al crear expediente');
      setCreating(false);
      return;
    }

    // Insert services
    if (services.length > 0) {
      const withFileId = services.map(s => ({ ...s, file_id: (fileData as any).id }));
      await supabase.from('file_services').insert(withFileId);
    }

    toast.success(`Expediente FILE-${String((fileData as any).file_number).padStart(3, '0')} creado`);
    navigate(`/files/${(fileData as any).id}`);
    setCreating(false);
  };

  return (
    <Button onClick={handleCreate} disabled={creating} variant="outline" size="sm">
      <FolderOpen className="mr-2 h-4 w-4" />
      {creating ? 'Creando...' : 'Crear Expediente'}
    </Button>
  );
}
