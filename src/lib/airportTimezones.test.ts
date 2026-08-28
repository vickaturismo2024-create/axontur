import { describe, it, expect } from 'vitest';
import { getAirportTimezone, convertLocalToUtc } from './airportTimezones';

describe('airportTimezones module', () => {
  it('should return correct IANA timezone for common airports', () => {
    expect(getAirportTimezone('EZE')).toBe('America/Argentina/Buenos_Aires');
    expect(getAirportTimezone('MIA')).toBe('America/New_York');
    expect(getAirportTimezone('MAD')).toBe('Europe/Madrid');
    expect(getAirportTimezone('GRU')).toBe('America/Sao_Paulo');
    expect(getAirportTimezone('NRT')).toBe('Asia/Tokyo');
  });

  it('should fallback to Buenos Aires timezone if airport is unknown or empty', () => {
    expect(getAirportTimezone(null)).toBe('America/Argentina/Buenos_Aires');
    expect(getAirportTimezone(undefined)).toBe('America/Argentina/Buenos_Aires');
    expect(getAirportTimezone('ZZZ')).toBe('America/Argentina/Buenos_Aires');
  });

  it('should convert local time to UTC correctly for Buenos Aires (UTC-3)', () => {
    // 2026-10-15 15:00 en EZE (UTC-3) -> 18:00 UTC
    const result = convertLocalToUtc('2026-10-15 15:00', 'EZE');
    expect(result.timezone).toBe('America/Argentina/Buenos_Aires');
    expect(result.utcDate).not.toBeNull();
    expect(result.isoUtc).toBe('2026-10-15T18:00:00.000Z');
  });

  it('should return nulls gracefully if date string is invalid', () => {
    const result = convertLocalToUtc('invalid-date', 'EZE');
    expect(result.utcDate).toBeNull();
    expect(result.isoUtc).toBeNull();
  });
});
