import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reminder {
  id: string;
  quote_id: string | null;
  reminder_date: string;
  message: string;
  completed: boolean;
}

interface RemindersPanelProps {
  quoteId?: string;
  quoteName?: string;
}

export function RemindersPanel({ quoteId, quoteName }: RemindersPanelProps) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState('');

  const fetch = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('reminders').select('*').order('reminder_date');
    if (quoteId) query = query.eq('quote_id', quoteId);
    const { data } = await query;
    if (data) setReminders(data as any);
  }, [user, quoteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addReminder = async () => {
    if (!user || !newMessage.trim() || !newDate) return;
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id, quote_id: quoteId || null,
      message: newMessage.trim(), reminder_date: new Date(newDate).toISOString(),
    } as any);
    if (error) { toast.error('Error al crear recordatorio'); return; }
    setNewMessage(''); setNewDate('');
    toast.success('Recordatorio creado');
    fetch();
  };

  const toggleCompleted = async (r: Reminder) => {
    await supabase.from('reminders').update({ completed: !r.completed } as any).eq('id', r.id);
    fetch();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    fetch();
  };

  const pending = reminders.filter(r => !r.completed);
  const completed = reminders.filter(r => r.completed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Recordatorios {quoteName && `— ${quoteName}`}
          {pending.length > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">{pending.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nuevo recordatorio..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="h-8 text-sm" onKeyDown={e => { if (e.key === 'Enter') addReminder(); }} />
          <Input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-sm w-auto" />
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={addReminder} disabled={!newMessage.trim() || !newDate}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
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
          {reminders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Sin recordatorios</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
