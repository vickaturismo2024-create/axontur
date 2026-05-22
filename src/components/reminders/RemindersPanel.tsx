import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
import { Bell, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reminder {
  id: string;
  quote_id: string | null;
  reminder_date: string;
  message: string;
  completed: boolean;
}

interface ServiceDue {
  id: string;
  description: string;
  supplier_name: string;
  payment_due_date: string;
  cost: number;
  currency: string;
  file_id: string;
}

interface RemindersPanelProps {
  quoteId?: string;
  quoteName?: string;
}

export function RemindersPanel({ quoteId, quoteName }: RemindersPanelProps) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [serviceDues, setServiceDues] = useState<ServiceDue[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('reminders').select('*').order('reminder_date');
    if (quoteId) query = query.eq('quote_id', quoteId);
    const { data } = await query;
    if (data) setReminders(data as any);

    // Fetch service due dates (overdue or within 3 days)
    if (!quoteId) {
      const { data: svcData } = await supabase
        .from('file_services')
        .select('id, description, supplier_name, payment_due_date, cost, currency, file_id, status')
        .not('payment_due_date', 'is', null)
        .neq('status', 'cancelled');
      if (svcData) {
        const dues = (svcData as any[]).filter(s => {
          const days = differenceInDays(new Date(s.payment_due_date), new Date());
          return days <= 3;
        });
        setServiceDues(dues);
      }
    }
  }, [user, quoteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addReminder = async () => {
    if (!user || !newMessage.trim() || !newDate) return;
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id, quote_id: quoteId || null,
      message: newMessage.trim(), reminder_date: new Date(newDate).toISOString(),
    } as any);
    if (error) { toast.error('Error al crear recordatorio'); return; }
    setNewMessage(''); setNewDate('');
    toast.success('Recordatorio creado');
    fetchData();
  };

  const toggleCompleted = async (r: Reminder) => {
    await supabase.from('reminders').update({ completed: !r.completed } as any).eq('id', r.id);
    fetchData();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    fetchData();
  };

  const pending = reminders.filter(r => !r.completed);
  const completed = reminders.filter(r => r.completed);
  const totalAlerts = pending.length + serviceDues.length;

  return (
    <CollapsibleWidget
      widgetKey="reminders"
      icon={<Bell className="h-4 w-4" />}
      title={quoteName ? `Recordatorios — ${quoteName}` : 'Recordatorios'}
      count={totalAlerts}
      badgeVariant={totalAlerts > 0 ? 'destructive' : 'secondary'}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nuevo recordatorio..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') addReminder(); }}
          />
          <Input
            type="datetime-local"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="h-8 text-sm w-auto"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={addReminder}
            disabled={!newMessage.trim() || !newDate}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {/* Service due date alerts */}
          {serviceDues.length > 0 && (
            <>
              <p className="text-xs font-medium text-destructive flex items-center gap-1 pt-1">
                <AlertTriangle className="h-3 w-3" />Vencimientos de servicios ({serviceDues.length})
              </p>
              {serviceDues.map(s => {
                const date = new Date(s.payment_due_date);
                const overdue = isPast(date) && !isToday(date);
                return (
                  <div key={s.id} className={`p-2 rounded text-sm ${overdue ? 'bg-destructive/10' : 'bg-yellow-500/10'}`}>
                    <p className="truncate font-medium">{s.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {s.supplier_name && <span>Prov: {s.supplier_name}</span>}
                      <span>{s.currency} {s.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      <span className={overdue ? 'text-destructive font-medium' : 'text-yellow-700 font-medium'}>
                        <Calendar className="inline h-3 w-3 mr-0.5" />
                        {format(date, "d MMM yyyy", { locale: es })}
                        {overdue && ' — Vencido'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Regular reminders */}
          {pending.map(r => {
            const date = new Date(r.reminder_date);
            const overdue = isPast(date) && !isToday(date);
            return (
              <div key={r.id} className={`flex items-center gap-2 p-2 rounded text-sm ${overdue ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                <Checkbox checked={false} onCheckedChange={() => toggleCompleted(r)} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{r.message}</p>
                  <p className={`text-xs flex items-center gap-1 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Calendar className="h-3 w-3" />
                    {format(date, "d MMM yyyy HH:mm", { locale: es })}
                    {overdue && ' — Vencido'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => deleteReminder(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          {completed.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-2">Completados ({completed.length})</p>
              {completed.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded text-sm opacity-50">
                  <Checkbox checked onCheckedChange={() => toggleCompleted(r)} />
                  <p className="flex-1 line-through truncate">{r.message}</p>
                  <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => deleteReminder(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </>
          )}

          {reminders.length === 0 && serviceDues.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Sin recordatorios</p>
          )}
        </div>
      </div>
    </CollapsibleWidget>
  );
}
