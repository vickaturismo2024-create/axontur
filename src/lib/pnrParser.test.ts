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
  });

  it('should parse PDF budget flight entries correctly', () => {
    const pdfText = `Estimado Pasajero:
Según lo solicitado, se detalla el presupuesto.

Vuelos
Opción 1
Fecha de cotización: 05/06/2026
Vuelo: (AEP) Buenos Aires, Argentina - (JPA) João Pessoa, Brasil Total USD 1.570,00
4 Sep - 11 Sep
2 adultos

Ida: Vie. 4 Sep. 2026
GOL AEP 02:15 ------- JPA 11:45 8h 20m

Vuelta: Vie. 11 Sep. 2026
GOL JPA 12:25 ------- AEP 21:00 8h 25m`;

    const parsed = parsePNR(pdfText);
    const flights = mapSegmentsToFlights(parsed.segments);

    expect(flights).toHaveLength(2);

    // Ida
    expect(flights[0].origin).toBe('Buenos Aires (AEP)');
    expect(flights[0].destination).toBe('João Pessoa (JPA)');
    expect(flights[0].date).toBe('2026-09-04');
    expect(flights[0].departureTime).toBe('02:15');
    expect(flights[0].arrivalTime).toBe('11:45');
    expect(flights[0].airline).toBe('GOL');

    // Vuelta
    expect(flights[1].origin).toBe('João Pessoa (JPA)');
    expect(flights[1].destination).toBe('Buenos Aires (AEP)');
    expect(flights[1].date).toBe('2026-09-11');
    expect(flights[1].departureTime).toBe('12:25');
    expect(flights[1].arrivalTime).toBe('21:00');
    expect(flights[1].airline).toBe('GOL');
  });
});
