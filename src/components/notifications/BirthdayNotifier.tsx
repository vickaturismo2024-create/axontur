import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsSafe } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BirthdayNotifier() {
  const { user } = useAuth();
  const settingsCtx = useSettingsSafe();
  const enabled = settingsCtx?.settings.notify_birthdays ?? true;

  useEffect(() => {
    if (!user) return;
    if (!enabled) return;

    const today = new Date();
    const key = `birthday_notified_${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    if (sessionStorage.getItem(key)) return;

    (async () => {
      const PAGE = 1000;
      let from = 0;
      const all: { name: string; birth_date: string }[] = [];
      while (true) {
        const { data } = await supabase
          .from('clients')
          .select('name, birth_date')
          .not('birth_date', 'is', null)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as { name: string; birth_date: string }[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      const birthdays = all.filter((c) => {
        if (!c.birth_date) return false;
        const [, m, d] = c.birth_date.split('-').map(Number);
        return m - 1 === todayMonth && d === todayDay;
      });

      birthdays.forEach((c, i) => {
        setTimeout(() => {
          toast(`🎂 ¡Hoy cumple años ${c.name}!`, { duration: 10000 });
        }, i * 800);
      });

      sessionStorage.setItem(key, '1');
    })();
  }, [user]);

  return null;
}
