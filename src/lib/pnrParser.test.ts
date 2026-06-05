import { describe, it, expect } from 'vitest';
import { parsePNR, mapSegmentsToFlights } from './pnrParser';

describe('pnrParser tests', () => {
  it('should parse the user PNR with 4*EZEGRU modifiers correctly without extra segments', () => {
    const pnrText = `2  LA8131 A 20AUG 4*EZEGRU DK1  0230 0500  20AUG  E  0 320 S
     010 DL 6350  LX 9711  QR 7290
     101 WPRYBHKMLVXSNQOGTAE
     127 LATAM AIRLINES BRASIL
     OPERATED BY SUBSIDIARY/FRANCHISE
     SEE RTSVC
  3  LA3636 A 20AUG 4*GRUJPA DK1  0910 1220  20AUG  E  0 321 G
     010 AM 8498  AR 8162  DL 7368  LX 9748  QR 8419  TP 6267
     101 WPRYBHKMLVXSNQOGTAE
     127 LATAM AIRLINES BRASIL
     OPERATED BY SUBSIDIARY/FRANCHISE
     SEE RTSVC
  4  LA3465 G 27AUG 4*JPAGRU DK1  1640 2010  27AUG  E  0 321 G
     010 AR 8096  DL 7406  QR 5158  TP 6268
     101 WPRYBHKMLVXSNQOGTAE
     127 LATAM AIRLINES BRASIL
     OPERATED BY SUBSIDIARY/FRANCHISE
     SEE RTSVC
  5  LA8130 G 27AUG 4*GRUEZE DK1  2200 0100  28AUG  E  0 320 S
     010 DL 6355  LX 9702  QR 5202`;

    const parsed = parsePNR(pnrText);

    expect(parsed.segments).toHaveLength(4);

    expect(parsed.segments[0]).toMatchObject({
      airlineCode: 'LA',
      flightNumber: '8131',
      originIata: 'EZE',
      destinationIata: 'GRU',
      bookingClass: 'A',
      segmentStatus: 'DK1'
    });

    expect(parsed.segments[1]).toMatchObject({
      airlineCode: 'LA',
      flightNumber: '3636',
      originIata: 'GRU',
      destinationIata: 'JPA',
      bookingClass: 'A',
      segmentStatus: 'DK1'
    });

    expect(parsed.segments[2]).toMatchObject({
      airlineCode: 'LA',
      flightNumber: '3465',
      originIata: 'JPA',
      destinationIata: 'GRU',
      bookingClass: 'G',
      segmentStatus: 'DK1'
    });

    expect(parsed.segments[3]).toMatchObject({
      airlineCode: 'LA',
      flightNumber: '8130',
      originIata: 'GRU',
      destinationIata: 'EZE',
      bookingClass: 'G',
      segmentStatus: 'DK1'
    });
  });

  it('should map segments to flights with translated city names and connecting flight groups', () => {
    const pnrText = `2  LA8131 A 20AUG 4*EZEGRU DK1  0230 0500  20AUG  E  0 320 S
     010 DL 6350  LX 9711  QR 7290
  3  LA3636 A 20AUG 4*GRUJPA DK1  0910 1220  20AUG  E  0 321 G
     010 AM 8498  AR 8162  DL 7368  LX 9748  QR 8419  TP 6267
  4  LA3465 G 27AUG 4*JPAGRU DK1  1640 2010  27AUG  E  0 321 G
     010 AR 8096  DL 7406  QR 5158  TP 6268
  5  LA8130 G 27AUG 4*GRUEZE DK1  2200 0100  28AUG  E  0 320 S
     010 DL 6355  LX 9702  QR 5202`;

    const parsed = parsePNR(pnrText);
    const flights = mapSegmentsToFlights(parsed.segments);

    expect(flights).toHaveLength(4);

    // EZE -> GRU (Stopover / conn1)
    expect(flights[0].origin).toBe('Buenos Aires (EZE)');
    expect(flights[0].destination).toBe('São Paulo (GRU)');
    expect(flights[0].flightType).toBe('stopover');
    expect(flights[0].connectionGroupId).toBeDefined();

    // GRU -> JPA (Stopover / conn1)
    expect(flights[1].origin).toBe('São Paulo (GRU)');
    expect(flights[1].destination).toBe('João Pessoa (JPA)');
    expect(flights[1].flightType).toBe('stopover');
    expect(flights[1].connectionGroupId).toBe(flights[0].connectionGroupId);

    // JPA -> GRU (Stopover / conn2)
    expect(flights[2].origin).toBe('João Pessoa (JPA)');
    expect(flights[2].destination).toBe('São Paulo (GRU)');
    expect(flights[2].flightType).toBe('stopover');
    expect(flights[2].connectionGroupId).toBeDefined();
    expect(flights[2].connectionGroupId).not.toBe(flights[0].connectionGroupId);

    // GRU -> EZE (Stopover / conn2)
    expect(flights[3].origin).toBe('São Paulo (GRU)');
    expect(flights[3].destination).toBe('Buenos Aires (EZE)');
    expect(flights[3].flightType).toBe('stopover');
    expect(flights[3].connectionGroupId).toBe(flights[2].connectionGroupId);
  });
});
