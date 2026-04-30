import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsSafe } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cake, MessageCircle, ChevronRight, PartyPopper } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { BirthdayWhatsAppDialog } from './BirthdayWhatsAppDialog';

interface BirthdayClient {
  id: string;
  name: string;
  phone: string;
  birth_date: string;
  monthDay: number; // 0..11 month, helper sort key
  /** Días desde hoy hasta el próximo cumple (0 = hoy). */
  daysUntil: number;
  /** Edad que cumple este año. */
  upcomingAge: number;
}

function buildBirthdayItem(c: { id: string; name: string; phone: string | null; birth_date: string }): BirthdayClient | null {
  if (!c.birth_date) return null;
  const [yStr, mStr, dStr] = c.birth_date.split('-');
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), month, day);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, month, day);
  }
  const msPerDay = 86400000;
  const daysUntil = Math.round((next.getTime() - today.getTime()) / msPerDay);

  const birth = parseISO(c.birth_date);
  const baseAge = differenceInYears(next, birth);

  return {
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    birth_date: c.birth_date,
    monthDay: month * 100 + day,
    daysUntil,
    upcomingAge: baseAge,
  };
}

export function BirthdayWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settingsCtx = useSettingsSafe();
  const enabled = settingsCtx?.settings.notify_birthdays ?? true;
  const [selected, setSelected] = useState<{ id: string; name: string; phone: string; age: number | null } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items, isLoading } = useQuery<BirthdayClient[]>({
    queryKey: ['birthday-widget', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const PAGE = 1000;
      let from = 0;
      const all: BirthdayClient[] = [];
      while (true) {
        const { data } = await supabase
          .from('clients')
          .select('id, name, phone, birth_date')
          .not('birth_date', 'is', null)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const c of data as any[]) {
          const it = buildBirthdayItem(c);
          if (it) all.push(it);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      // Filtramos los próximos 31 días
      return all.filter(i => i.daysUntil <= 31).sort((a, b) => a.daysUntil - b.daysUntil);
    },
    enabled: !!user && enabled,
  });

  if (!enabled) return null;

  const today = (items || []).filter(i => i.daysUntil === 0);
  const week = (items || []).filter(i => i.daysUntil > 0 && i.daysUntil <= 7);
  const month = (items || []).filter(i => i.daysUntil > 7 && i.daysUntil <= 31);
  const total = (items || []).length;

  const openWhatsApp = (i: BirthdayClient) => {
    setSelected({ id: i.id, name: i.name, phone: i.phone, age: i.daysUntil === 0 ? i.upcomingAge : null });
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="h-5 w-5 text-pink-500" />
            Cumpleaños
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : total === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin cumpleaños este mes
            </p>
          ) : (
            <div className="space-y-3">
              {today.length > 0 && (
                <Section
                  icon={<PartyPopper className="h-4 w-4 text-pink-500" />}
                  title="Hoy"
                  items={today}
                  highlight
                  onWhatsApp={openWhatsApp}
                  navigate={navigate}
                />
              )}
              {week.length > 0 && (
                <Section
                  icon={<Cake className="h-4 w-4" />}
                  title="Esta semana"
                  items={week}
                  onWhatsApp={openWhatsApp}
                  navigate={navigate}
                />
              )}
              {month.length > 0 && (
                <Section
                  icon={<Cake className="h-4 w-4" />}
                  title="Próximos"
                  items={month}
                  onWhatsApp={openWhatsApp}
                  navigate={navigate}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <BirthdayWhatsAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selected}
      />
    </>
  );
}

function Section({ icon, title, items, highlight, onWhatsApp, navigate }: {
  icon: React.ReactNode;
  title: string;
  items: BirthdayClient[];
  highlight?: boolean;
  onWhatsApp: (i: BirthdayClient) => void;
  navigate: (to: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon} {title} ({items.length})
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map(i => {
          const dateLabel = format(parseISO(i.birth_date), "d 'de' MMM", { locale: es });
          return (
            <div
              key={i.id}
              className={`group flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                highlight ? 'border-pink-500/40 bg-pink-500/5' : ''
              }`}
            >
              <button
                onClick={() => navigate(`/clients?highlight=${encodeURIComponent(i.name)}`)}
                className="min-w-0 flex-1 text-left hover:underline"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{i.name}</span>
                  {highlight && (
                    <Badge variant="secondary" className="text-[10px] bg-pink-500/15 text-pink-700 dark:text-pink-300 border-0">
                      cumple {i.upcomingAge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateLabel}
                  {!highlight && ` · cumple ${i.upcomingAge}`}
                </p>
              </button>
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          disabled={!i.phone}
                          onClick={() => onWhatsApp(i)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {i.phone ? 'Saludar por WhatsApp' : 'Sin teléfono'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </div>
          );
        })}
        {items.length > 5 && (
          <p className="pl-2 text-xs text-muted-foreground">+ {items.length - 5} más</p>
        )}
      </div>
    </div>
  );
}
