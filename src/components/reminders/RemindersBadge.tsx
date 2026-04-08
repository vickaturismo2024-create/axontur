import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import { isPast } from 'date-fns';

export function RemindersBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { data } = await supabase
        .from('reminders')
        .select('id, reminder_date')
        .eq('completed', false);
      if (data) {
        const overdue = data.filter(r => isPast(new Date((r as any).reminder_date)));
        setCount(overdue.length);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
