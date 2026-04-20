import { useQuery } from '@tanstack/react-query';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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

export const CurrencyRatesWidget = () => {
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: fetchRates,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold">Cotizaciones</h3>
            {dataUpdatedAt > 0 && (
              <p className="text-xs text-muted-foreground">
                Actualizado {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: es })}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8 p-0"
          title="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No se pudo obtener cotizaciones. Intentá nuevamente.
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(data?.rates ?? []).map((rate) => {
              const highlight = HIGHLIGHT_KEYS.has(rate.key);
              const isBitcoin = rate.key === 'btc_usd';
              return (
                <div
                  key={rate.key}
                  className={`rounded-lg border p-3 transition-colors ${
                    highlight
                      ? 'border-gold/40 bg-gold/5'
                      : 'border-border bg-background hover:bg-accent/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {rate.label}
                    </span>
                    {highlight && <TrendingUp className="h-3 w-3 text-gold flex-shrink-0" />}
                  </div>
                  <div className="mt-1 text-lg font-bold leading-tight">
                    {rate.venta != null ? `$${formatNumber(rate.venta)}` : '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
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
          <p className="mt-3 text-[10px] text-muted-foreground text-right">
            Fuente: {data?.source ?? '0223.com.ar'}
          </p>
        </>
      )}
    </div>
  );
};
