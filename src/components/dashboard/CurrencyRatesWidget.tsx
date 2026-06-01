import { useQuery } from '@tanstack/react-query';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';

interface Rate {
  key: string;
  label: string;
  compra: number | null;
  venta: number | null;
  currency?: string;
}

interface RatesResponse {
  updatedAt: string;
  source: string;
  rates: Rate[];
}

async function fetchRates(): Promise<RatesResponse> {
  const { data, error } = await supabase.functions.invoke<RatesResponse>('fetch-currency-rates');
  if (error) throw error;
  if (!data) throw new Error('Respuesta vacía');
  return data;
}

const formatNumber = (n: number) => {
  // Para CLP que viene como 1.5592 conviene mostrar 4 decimales; resto 2.
  const decimals = n < 10 ? 4 : 2;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

const HIGHLIGHT_KEYS = new Set(['usd_blue']);

export const CurrencyRatesWidget = ({ raw }: { raw?: boolean }) => {
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: fetchRates,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const renderContent = () => (
    <div className="space-y-4">
      {/* Encabezado interno con botón de actualizar */}
      {raw ? (
        <div className="absolute top-5 right-5 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 w-7 p-0 hover:bg-muted"
            title="Actualizar cotizaciones"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {dataUpdatedAt > 0
              ? `Actualizado ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: es })}`
              : 'Cotizaciones en tiempo real'}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 w-7 p-0"
            title="Actualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {error ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No se pudo obtener cotizaciones. Intentá nuevamente.
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(data?.rates ?? []).map((rate) => {
              const highlight = HIGHLIGHT_KEYS.has(rate.key);
              const isBitcoin = rate.key === 'btc_usd';
              return (
                <div
                  key={rate.key}
                  className={`rounded-lg border p-2.5 transition-colors ${
                    highlight
                      ? 'border-gold/40 bg-gold/5'
                      : 'border-border bg-background/50 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                      {rate.label}
                    </span>
                    {highlight && <TrendingUp className="h-3 w-3 text-gold flex-shrink-0" />}
                  </div>
                  <div className="mt-1 text-base font-extrabold leading-none tracking-tight">
                    {rate.venta != null ? `$${formatNumber(rate.venta)}` : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {isBitcoin
                      ? rate.currency || 'USD'
                      : rate.compra != null
                      ? `Compra $${formatNumber(rate.compra)}`
                      : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground text-right">
            Fuente: {data?.source ?? '0223.com.ar'}
          </p>
        </>
      )}
    </div>
  );

  if (raw) {
    return renderContent();
  }

  return (
    <CollapsibleWidget
      widgetKey="currency-rates"
      icon={<DollarSign className="h-4 w-4 text-[hsl(var(--gold))]" />}
      title="Cotizaciones del Mercado"
      defaultOpen={true}
    >
      {renderContent()}
    </CollapsibleWidget>
  );
};
