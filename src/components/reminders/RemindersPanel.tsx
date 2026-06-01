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
  defaultOpen?: boolean;
  raw?: boolean;
}

export function RemindersPanel({ quoteId, quoteName, defaultOpen, raw }: RemindersPanelProps) {
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

  const renderContent = () => (
    <div className="space-y-4">
      {/* Styled Task Input Group */}
      <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-3">
        <Input
          placeholder="Escribí una tarea..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="h-9 text-xs rounded-lg bg-background border-border"
          onKeyDown={e => { if (e.key === 'Enter') addReminder(); }}
        />
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="h-9 text-xs rounded-lg bg-background border-border flex-1"
          />
          <Button
            size="sm"
            onClick={addReminder}
            disabled={!newMessage.trim() || !newDate}
            className="h-9 px-3 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-colors shrink-0"
          >
            Agregar
          </Button>
        </div>
      </div>

      {/* Task Items List */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
        {/* Service due date alerts */}
        {serviceDues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-destructive uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Vencimientos de servicios ({serviceDues.length})</span>
            </div>
            {serviceDues.map(s => {
              const date = new Date(s.payment_due_date);
              const overdue = isPast(date) && !isToday(date);
              return (
                <div 
                  key={s.id} 
                  className={`rounded-xl border p-3.5 transition-all hover:scale-[1.01] hover:shadow-sm text-sm border-l-4 ${
                    overdue 
                      ? 'border-l-destructive border-border/60 bg-destructive/[0.02]' 
                      : 'border-l-amber-500 border-border/60 bg-amber-500/[0.02]'
                  }`}
                >
                  <p className="font-semibold text-foreground truncate">{s.description}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground font-medium">
                    {s.supplier_name && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Prov: {s.supplier_name}</span>}
                    <span>{s.currency} {s.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    <span className={`flex items-center gap-0.5 ${overdue ? 'text-destructive font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}`}>
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {format(date, "d MMM yyyy", { locale: es })}
                      {overdue && ' (Vencido)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Regular reminders */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map(r => {
              const date = new Date(r.reminder_date);
              const overdue = isPast(date) && !isToday(date);
              return (
                <div 
                  key={r.id} 
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all hover:scale-[1.01] hover:shadow-sm text-sm bg-background/50 border-l-4 ${
                    overdue 
                      ? 'border-l-destructive border-border/60 hover:border-destructive/35 hover:bg-destructive/[0.02]' 
                      : 'border-l-primary/30 border-border/60 hover:border-primary/45 hover:bg-accent/5 dark:border-l-gold/30 dark:hover:border-gold/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <Checkbox 
                      checked={false} 
                      onCheckedChange={() => toggleCompleted(r)} 
                      className="mt-0.5 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-xs leading-relaxed break-words">{r.message}</p>
                      <p className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {format(date, "d MMM yyyy HH:mm", { locale: es })}
                        {overdue && ' (Vencido)'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0" 
                    onClick={() => deleteReminder(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed reminders */}
        {completed.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40 mt-2">
            <div className="px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Completadas ({completed.length})
            </div>
            {completed.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/10 p-2.5 text-xs opacity-60">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Checkbox 
                    checked 
                    onCheckedChange={() => toggleCompleted(r)} 
                    className="rounded"
                  />
                  <p className="line-through text-muted-foreground font-medium truncate flex-1">{r.message}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0" 
                  onClick={() => deleteReminder(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {reminders.length === 0 && serviceDues.length === 0 && (
          <div className="py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Sin recordatorios ni tareas pendientes</p>
          </div>
        )}
      </div>
    </div>
  );

  if (raw) {
    return renderContent();
  }

  return (
    <CollapsibleWidget
      widgetKey="reminders"
      icon={<Bell className="h-4 w-4 text-[hsl(var(--gold))]" />}
      title={quoteName ? `Recordatorios — ${quoteName}` : 'Recordatorios y Tareas'}
      count={totalAlerts}
      badgeVariant={totalAlerts > 0 ? 'destructive' : 'secondary'}
      defaultOpen={defaultOpen}
    >
      {renderContent()}
    </CollapsibleWidget>
  );
}
