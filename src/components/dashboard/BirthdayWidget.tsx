import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsSafe } from '@/contexts/SettingsContext';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
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
  monthDay: number;
  daysUntil: number;
  upcomingAge: number;
}

function buildBirthdayItem(c: { id: string; name: string; phone: string | null; phone_mobile: string | null; phone_work?: string | null; birth_date: string }): BirthdayClient | null {
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

  const phoneVal = (c.phone_mobile || '').trim() || (c.phone || '').trim() || (c.phone_work || '').trim() || '';

  return {
    id: c.id,
    name: c.name,
    phone: phoneVal,
    birth_date: c.birth_date,
    monthDay: month * 100 + day,
    daysUntil,
    upcomingAge: baseAge,
  };
}

export function BirthdayWidget({ defaultOpen, raw }: { defaultOpen?: boolean; raw?: boolean }) {
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
          .select('id, name, phone, phone_mobile, phone_work, birth_date')
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      );
    }

    if (total === 0) {
      return (
        <div className="py-8 text-center">
          <Cake className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Sin cumpleaños en los próximos 30 días</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {today.length > 0 && (
          <Section
            icon={<PartyPopper className="h-3.5 w-3.5 text-pink-500" />}
            title="Hoy"
            items={today}
            highlight
            onWhatsApp={openWhatsApp}
            navigate={navigate}
          />
        )}
        {week.length > 0 && (
          <Section
            icon={<Cake className="h-3.5 w-3.5 text-primary dark:text-gold" />}
            title="Esta semana"
            items={week}
            onWhatsApp={openWhatsApp}
            navigate={navigate}
          />
        )}
        {month.length > 0 && (
          <Section
            icon={<Cake className="h-3.5 w-3.5 text-muted-foreground" />}
            title="Próximos 30 días"
            items={month}
            onWhatsApp={openWhatsApp}
            navigate={navigate}
          />
        )}
      </div>
    );
  };

  if (raw) {
    return (
      <>
        {renderContent()}
        <BirthdayWhatsAppDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={selected}
        />
      </>
    );
  }

  return (
    <>
      <CollapsibleWidget
        widgetKey="birthdays"
        icon={<Cake className="h-4 w-4 text-pink-500" />}
        title="Cumpleaños"
        count={total}
        badgeVariant={today.length > 0 ? 'destructive' : 'secondary'}
        defaultOpen={defaultOpen}
      >
        {renderContent()}
      </CollapsibleWidget>

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
  const [visibleCount, setVisibleCount] = useState(5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{title}</span>
        <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px]">{items.length}</span>
      </div>
      
      <div className="space-y-2">
        {items.slice(0, visibleCount).map(i => {
          const dateLabel = format(parseISO(i.birth_date), "d 'de' MMM", { locale: es });
          const initials = i.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          
          return (
            <div
              key={i.id}
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm ${
                highlight
                  ? 'border-pink-500/20 bg-gradient-to-r from-pink-500/[0.05] via-pink-500/[0.01] to-transparent'
                  : 'border-border/60 bg-background/50 hover:border-primary/20 dark:hover:border-gold/30 hover:bg-accent/5'
              }`}
            >
              <button
                onClick={() => navigate(`/clients?info=${i.id}`)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left"
              >
                {/* CRM-Style Avatar */}
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                  highlight 
                    ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' 
                    : 'bg-primary/5 text-primary dark:bg-gold/10 dark:text-gold'
                }`}>
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary dark:group-hover:text-gold transition-colors">
                      {i.name}
                    </span>
                    {highlight && (
                      <Badge className="text-[9px] h-4.5 bg-pink-500 text-white font-bold border-0 animate-pulse">
                        ¡Cumple hoy!
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                    <span>{dateLabel}</span>
                    <span>•</span>
                    <span>Cumple {i.upcomingAge} años</span>
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 rounded-lg transition-colors ${
                            i.phone 
                              ? 'text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-950 dark:hover:bg-emerald-400' 
                              : 'text-muted-foreground/40 cursor-not-allowed'
                          }`}
                          disabled={!i.phone}
                          onClick={(e) => { e.stopPropagation(); onWhatsApp(i); }}
                        >
                          <MessageCircle className="h-4.5 w-4.5" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {i.phone ? 'Saludar por WhatsApp' : 'Sin teléfono cargado'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
        {items.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="w-full text-center text-[10px] font-bold text-primary hover:text-primary/80 dark:text-gold dark:hover:text-gold/80 pt-2 pb-2 block bg-muted/10 hover:bg-muted/30 rounded-lg border border-dashed border-border/50 transition-colors"
          >
            + Ver {Math.min(5, items.length - visibleCount)} cumpleaños más (quedan {items.length - visibleCount})
          </button>
        )}
      </div>
    </div>
  );
}
