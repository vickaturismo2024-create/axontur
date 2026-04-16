import { useQuery } from '@tanstack/react-query';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Rate {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
  moneda?: string;
}

const USD_LABELS: Record<string, string> = {
  oficial: 'USD Oficial',
  blue: 'USD Blue',
  bolsa: 'USD MEP',
  contadoconliqui: 'USD CCL',
  tarjeta: 'USD Tarjeta',
};

const USD_KEYS = ['oficial', 'blue', 'bolsa', 'tarjeta'];

async function fetchRates(): Promise<Rate[]> {
  const [dolaresRes, eurRes, brlRes] = await Promise.all([
    fetch('https://dolarapi.com/v1/dolares'),
    fetch('https://dolarapi.com/v1/cotizaciones/eur'),
    fetch('https://dolarapi.com/v1/cotizaciones/brl'),
  ]);
  if (!dolaresRes.ok) throw new Error('Error al obtener cotizaciones');
  const dolares: Rate[] = await dolaresRes.json();
  const usdRates = dolares.filter(d => USD_KEYS.includes(d.casa));

  const extras: Rate[] = [];
  if (eurRes.ok) {
    const eur = await eurRes.json();
    extras.push({ ...eur, nombre: 'EUR Oficial' });
  }
  if (brlRes.ok) {
    const brl = await brlRes.json();
    extras.push({ ...brl, nombre: 'BRL Oficial' });
  }
  return [...usdRates, ...extras];
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const CurrencyRatesWidget = () => {
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: fetchRates,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const getLabel = (rate: Rate) => USD_LABELS[rate.casa] || rate.nombre;
  const isBlue = (rate: Rate) => rate.casa === 'blue';

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {data?.map((rate) => (
            <div
              key={rate.casa + rate.nombre}
              className={`rounded-lg border p-3 transition-colors ${
                isBlue(rate)
                  ? 'border-gold/40 bg-gold/5'
                  : 'border-border bg-background hover:bg-accent/30'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {getLabel(rate)}
                </span>
                {isBlue(rate) && <TrendingUp className="h-3 w-3 text-gold flex-shrink-0" />}
              </div>
              <div className="mt-1 text-lg font-bold leading-tight">
                ${formatNumber(rate.venta)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Compra ${formatNumber(rate.compra)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
