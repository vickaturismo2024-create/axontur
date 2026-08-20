/**
 * Cálculo correcto del total de un recibo con líneas en monedas distintas.
 *
 * Convención del TC en `file_receipt_items`:
 *   - `currency`         → moneda en que el cliente pagó la línea
 *   - `service_currency` → moneda "real" del servicio (ej. USD)
 *   - `exchange_rate`    → "1 service_currency = exchange_rate currency"
 *
 * Conversión de una línea a la moneda principal del recibo:
 *   - line.currency == main             → amount tal cual
 *   - line.service_currency == main + TC → amount / rate
 *   - resto                             → no convertible (queda como subtotal aparte)
 */

export interface ReceiptLineForTotal {
  amount: number | string;
  currency: string;
  service_currency?: string | null;
  exchange_rate?: number | string | null;
}

export interface ReceiptTotalsResult {
  /** Suma cruda por moneda (sin conversión). */
  subtotalsByCurrency: Record<string, number>;
  /** Total expresado en la moneda principal usando los TC. */
  convertedTotal: number;
  /** Líneas en otra moneda sin TC para poder convertir. */
  unconvertibleLines: ReceiptLineForTotal[];
  /** True si hay al menos una línea en moneda distinta a la principal. */
  isMultiCurrency: boolean;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function computeReceiptTotals(
  items: ReceiptLineForTotal[],
  mainCurrency: string,
): ReceiptTotalsResult {
  const subtotalsByCurrency: Record<string, number> = {};
  const unconvertibleLines: ReceiptLineForTotal[] = [];
  let convertedTotal = 0;
  let otherCurrencyFound = false;

  for (const line of items) {
    const amt = num(line.amount);
    if (amt === 0) continue;
    const cur = line.currency || mainCurrency;
    subtotalsByCurrency[cur] = (subtotalsByCurrency[cur] || 0) + amt;

    if (cur === mainCurrency) {
      convertedTotal += amt;
    } else {
      otherCurrencyFound = true;
      const rate = num(line.exchange_rate);
      if (line.service_currency === mainCurrency && rate > 0) {
        convertedTotal += getConvertedAmount(amt, cur, mainCurrency, rate);
      } else {
        unconvertibleLines.push(line);
      }
    }
  }

  // Redondeo a 2 decimales para evitar ruido de floats
  convertedTotal = Math.round(convertedTotal * 100) / 100;

  return {
    subtotalsByCurrency,
    convertedTotal,
    unconvertibleLines,
    isMultiCurrency: otherCurrencyFound,
  };
}

export function getConvertedAmount(
  amount: number,
  currency: string,
  targetCurrency: string,
  rate: number
): number {
  if (!rate || rate <= 0) return amount;
  if (currency === targetCurrency) return amount;

  // ARS a moneda extranjera: Dividimos por la cotización (ej: 100.000 ARS / 1000 = 100 USD)
  if (currency === 'ARS' && targetCurrency !== 'ARS') {
    return amount / rate;
  }
  
  // Moneda extranjera a ARS: Multiplicamos por la cotización (ej: 100 USD * 1000 = 100.000 ARS)
  if (currency !== 'ARS' && targetCurrency === 'ARS') {
    return amount * rate;
  }

  // Por defecto (ej. USD a EUR) asumimos que el rate se expresa como "unidades de currency por unidad de targetCurrency"
  return amount / rate;
}

export function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
