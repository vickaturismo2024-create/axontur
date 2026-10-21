import { describe, it, expect } from 'vitest';
import { getConvertedAmount, computeReceiptTotals, getLiveRate, formatMoney } from './receiptTotals';

describe('receiptTotals - Currency Conversion & Calculations', () => {
  describe('getConvertedAmount', () => {
    it('converts USD to ARS by multiplying by exchange rate (User specific case)', () => {
      // 550 USD at 1527.77 ARS/USD = 840,273.50 ARS
      const result = getConvertedAmount(550, 'USD', 'ARS', 1527.77);
      expect(result).toBeCloseTo(840273.5, 2);
    });

    it('converts EUR to ARS by multiplying by exchange rate', () => {
      const result = getConvertedAmount(500, 'EUR', 'ARS', 1600);
      expect(result).toBe(800000);
    });

    it('converts ARS to USD by dividing by exchange rate', () => {
      const result = getConvertedAmount(840273.5, 'ARS', 'USD', 1527.77);
      expect(result).toBeCloseTo(550, 2);
    });

    it('converts ARS to EUR by dividing by exchange rate', () => {
      const result = getConvertedAmount(800000, 'ARS', 'EUR', 1600);
      expect(result).toBe(500);
    });

    it('returns original amount if currencies are identical', () => {
      expect(getConvertedAmount(550, 'USD', 'USD', 1500)).toBe(550);
      expect(getConvertedAmount(100000, 'ARS', 'ARS', 1500)).toBe(100000);
    });

    it('returns original amount if rate is invalid (0, negative, null, undefined)', () => {
      expect(getConvertedAmount(550, 'USD', 'ARS', 0)).toBe(550);
      expect(getConvertedAmount(550, 'USD', 'ARS', -1500)).toBe(550);
      expect(getConvertedAmount(550, 'USD', 'ARS', Number.NaN)).toBe(550);
    });
  });

  describe('computeReceiptTotals', () => {
    it('computes total when line is in the same main currency', () => {
      const items = [{ amount: 550, currency: 'USD' }];
      const result = computeReceiptTotals(items, 'USD');
      expect(result.convertedTotal).toBe(550);
      expect(result.subtotalsByCurrency['USD']).toBe(550);
      expect(result.isMultiCurrency).toBe(false);
      expect(result.unconvertibleLines.length).toBe(0);
    });

    it('computes total in USD when lines are mixed (USD + ARS converted)', () => {
      const items = [
        { amount: 100, currency: 'USD' },
        { amount: 150000, currency: 'ARS', service_currency: 'USD', exchange_rate: 1500 },
      ];
      const result = computeReceiptTotals(items, 'USD');
      // 100 USD + (150000 ARS / 1500 = 100 USD) = 200 USD
      expect(result.convertedTotal).toBe(200);
      expect(result.subtotalsByCurrency['USD']).toBe(100);
      expect(result.subtotalsByCurrency['ARS']).toBe(150000);
      expect(result.isMultiCurrency).toBe(true);
      expect(result.unconvertibleLines.length).toBe(0);
    });

    it('computes total in ARS when lines are mixed (ARS + USD converted)', () => {
      const items = [
        { amount: 150000, currency: 'ARS' },
        { amount: 100, currency: 'USD', service_currency: 'ARS', exchange_rate: 1500 },
      ];
      const result = computeReceiptTotals(items, 'ARS');
      // 150,000 ARS + (100 USD * 1500 = 150,000 ARS) = 300,000 ARS
      expect(result.convertedTotal).toBe(300000);
      expect(result.subtotalsByCurrency['ARS']).toBe(150000);
      expect(result.subtotalsByCurrency['USD']).toBe(100);
      expect(result.isMultiCurrency).toBe(true);
      expect(result.unconvertibleLines.length).toBe(0);
    });

    it('handles line with exchange rate even if service_currency is omitted', () => {
      const items = [
        { amount: 500, currency: 'USD' },
        { amount: 150000, currency: 'ARS', exchange_rate: 1500 }, // service_currency omitted
      ];
      const result = computeReceiptTotals(items, 'USD');
      // 500 USD + (150000 / 1500 = 100 USD) = 600 USD
      expect(result.convertedTotal).toBe(600);
      expect(result.unconvertibleLines.length).toBe(0);
    });

    it('tracks unconvertible line if line has different currency and no rate', () => {
      const items = [
        { amount: 500, currency: 'USD' },
        { amount: 150000, currency: 'ARS' }, // no rate
      ];
      const result = computeReceiptTotals(items, 'USD');
      expect(result.convertedTotal).toBe(500);
      expect(result.unconvertibleLines.length).toBe(1);
    });
  });

  describe('getLiveRate', () => {
    const mockRates = [
      { key: 'usd_blue', compra: 1480, venta: 1500 },
      { key: 'euro_blue', compra: 1600, venta: 1630 },
      { key: 'real_oficial', compra: 250, venta: 270 },
    ];

    it('returns compra rate when paying USD to get ARS', () => {
      expect(getLiveRate('USD', 'ARS', mockRates)).toBe(1480);
    });

    it('returns venta rate when paying ARS to get USD', () => {
      expect(getLiveRate('ARS', 'USD', mockRates)).toBe(1500);
    });

    it('returns compra rate when paying EUR to get ARS', () => {
      expect(getLiveRate('EUR', 'ARS', mockRates)).toBe(1600);
    });

    it('returns 1 if rates are missing or same currency', () => {
      expect(getLiveRate('USD', 'USD', mockRates)).toBe(1);
      expect(getLiveRate('USD', 'ARS', [])).toBe(1);
    });
  });

  describe('formatMoney', () => {
    it('formats ARS money correctly with decimals', () => {
      const formatted = formatMoney('ARS', 840273.5);
      expect(formatted).toContain('840.273,50');
    });
  });
});
