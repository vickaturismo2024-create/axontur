import ExcelJS from 'exceljs';
import { Quote } from '@/types/quote';

export async function exportQuoteToExcel(quote: Quote) {
  const wb = new ExcelJS.Workbook();
  const currency = quote.trip.currency || 'USD';
  const fmt = (n?: number) => n ?? 0;

  // ── Sheet 1: Resumen ──────────────────────────────────────────
  const wsResumen = wb.addWorksheet('Resumen');
  wsResumen.columns = [
    { width: 22 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 13 },
  ];

  wsResumen.addRow(['PRESUPUESTO DE VIAJE - RESUMEN INTERNO']);
  wsResumen.addRow([]);
  wsResumen.addRow(['Cliente', quote.client.name]);
  wsResumen.addRow(['Email', quote.client.email]);
  wsResumen.addRow(['Teléfono', quote.client.phone]);
  wsResumen.addRow([]);
  wsResumen.addRow(['Destino', quote.trip.destination]);
  wsResumen.addRow(['Fecha inicio', quote.trip.startDate]);
  wsResumen.addRow(['Fecha fin', quote.trip.endDate]);
  wsResumen.addRow(['Viajeros', quote.trip.travelers]);
  wsResumen.addRow(['Moneda', currency]);
  wsResumen.addRow(['Estado', quote.status]);
  wsResumen.addRow([]);
  wsResumen.addRow(['DESGLOSE FINANCIERO']);
  wsResumen.addRow(['Concepto', 'Costo', 'Precio', 'Margen', 'Margen %']);

  const breakdown = quote.pricing.breakdown;
  if (breakdown) {
    const categories = [
      { name: 'Vuelos',      data: breakdown.flights },
      { name: 'Alojamiento', data: { cost: 0, price: 0 } },
      { name: 'Traslados',   data: breakdown.transfers },
      { name: 'Trenes',      data: breakdown.trains },
      { name: 'Ferrys',      data: breakdown.ferries },
      { name: 'Autos',       data: breakdown.rentalCars },
      { name: 'Actividades', data: breakdown.activities },
      { name: 'Crucero',     data: breakdown.cruise },
      { name: 'Seguro',      data: breakdown.insurance },
    ];

    const lodgings = quote.lodgings?.length
      ? quote.lodgings
      : quote.lodging?.name ? [quote.lodging] : [];
    const lodgingCost  = lodgings.reduce((s, l) => s + fmt(l.totalCost  || (l.costPerNight  || 0) * (l.nights || 0)), 0);
    const lodgingPrice = lodgings.reduce((s, l) => s + fmt(l.totalPrice || (l.pricePerNight || 0) * (l.nights || 0)), 0);
    categories[1].data = { cost: lodgingCost, price: lodgingPrice };

    let totalCost = 0, totalPrice = 0;
    categories.forEach(c => {
      const margin = c.data.price - c.data.cost;
      const pct    = c.data.cost > 0 ? (margin / c.data.cost * 100) : 0;
      wsResumen.addRow([c.name, c.data.cost, c.data.price, margin, Math.round(pct)]);
      totalCost  += c.data.cost;
      totalPrice += c.data.price;
    });

    wsResumen.addRow([]);
    const totalMargin = totalPrice - totalCost;
    const totalPct    = totalCost > 0 ? (totalMargin / totalCost * 100) : 0;
    wsResumen.addRow(['TOTAL', totalCost, totalPrice, totalMargin, Math.round(totalPct)]);
    wsResumen.addRow([
      'Por persona',
      Math.round(totalCost  / (quote.trip.travelers || 1)),
      Math.round(totalPrice / (quote.trip.travelers || 1)),
    ]);
  }

  // ── Sheet 2: Vuelos ───────────────────────────────────────────
  if (quote.flights.length > 0) {
    const ws = wb.addWorksheet('Vuelos');
    ws.columns = Array(9).fill({ width: 16 });
    ws.addRow(['Origen', 'Destino', 'Fecha', 'Aerolínea', 'Vuelo', 'Equipaje', 'Costo', 'Precio', 'Operador']);
    quote.flights.forEach(f => {
      ws.addRow([f.origin, f.destination, f.date, f.airline, f.flightNumber, f.luggage, fmt(f.cost), fmt(f.price), f.supplier || '']);
    });
  }

  // ── Sheet 3: Alojamiento ──────────────────────────────────────
  const lodgings = quote.lodgings?.length
    ? quote.lodgings
    : quote.lodging?.name ? [quote.lodging] : [];
  if (lodgings.length > 0) {
    const ws = wb.addWorksheet('Alojamiento');
    ws.columns = Array(11).fill({ width: 16 });
    ws.addRow(['Hotel', 'Categoría', 'Destino', 'Check-in', 'Check-out', 'Noches', 'Habitación', 'Régimen', 'Costo', 'Precio', 'Operador']);
    lodgings.forEach(l => {
      ws.addRow([
        l.name, l.category, l.destination || '', l.checkIn, l.checkOut,
        l.nights, l.roomType, l.regime,
        fmt(l.totalCost  || (l.costPerNight  || 0) * l.nights),
        fmt(l.totalPrice || (l.pricePerNight || 0) * l.nights),
        l.supplier || '',
      ]);
    });
  }

  // ── Sheet 4: Transportes ──────────────────────────────────────
  const allTransports = [
    ...quote.transfers.map(t => ({
      tipo: 'Traslado', desc: t.description, fecha: t.dateTime,
      costo: fmt(t.cost), precio: fmt(t.price), operador: t.supplier || '', incluido: t.included,
    })),
    ...(quote.trains || []).map(t => ({
      tipo: 'Tren', desc: `${t.origin} → ${t.destination}`, fecha: t.date,
      costo: fmt(t.cost), precio: fmt(t.price), operador: t.supplier || '', incluido: t.included,
    })),
    ...(quote.ferries || []).map(f => ({
      tipo: 'Ferry', desc: `${f.origin} → ${f.destination}`, fecha: f.date,
      costo: fmt(f.cost), precio: fmt(f.price), operador: f.supplier || '', incluido: f.included,
    })),
    ...(quote.rentalCars || []).map(r => ({
      tipo: 'Auto', desc: `${r.company} - ${r.carType}`, fecha: r.pickupDate,
      costo: fmt(r.cost), precio: fmt(r.price), operador: r.supplier || '', incluido: r.included,
    })),
  ];
  if (allTransports.length > 0) {
    const ws = wb.addWorksheet('Transportes');
    ws.columns = Array(7).fill({ width: 19 });
    ws.addRow(['Tipo', 'Descripción', 'Fecha', 'Incluido', 'Costo', 'Precio', 'Operador']);
    allTransports.forEach(t => {
      ws.addRow([t.tipo, t.desc, t.fecha, t.incluido ? 'Sí' : 'No', t.costo, t.precio, t.operador]);
    });
  }

  // ── Sheet 5: Actividades ──────────────────────────────────────
  if (quote.activities && quote.activities.length > 0) {
    const ws = wb.addWorksheet('Actividades');
    ws.columns = Array(8).fill({ width: 19 });
    ws.addRow(['Actividad', 'Fecha', 'Hora', 'Ubicación', 'Incluida', 'Costo', 'Precio', 'Operador']);
    quote.activities.forEach(a => {
      ws.addRow([a.name, a.date, a.time, a.location, a.included ? 'Sí' : 'No', fmt(a.cost), fmt(a.price), a.supplier || '']);
    });
  }

  // ── Sheet 6: Crucero ──────────────────────────────────────────
  if (quote.cruise) {
    const c  = quote.cruise;
    const ws = wb.addWorksheet('Crucero');
    ws.columns = [{ width: 16 }, { width: 32 }];
    ws.addRow(['CRUCERO']);
    ws.addRow(['Barco',        c.shipName]);
    ws.addRow(['Compañía',     c.company]);
    ws.addRow(['Cabina',       `${c.cabinType} - ${c.cabinNumber}`]);
    ws.addRow(['Embarque',     `${c.embarkationPort} (${c.embarkationDate})`]);
    ws.addRow(['Desembarque',  `${c.disembarkationPort} (${c.disembarkationDate})`]);
    ws.addRow(['Noches',       c.nights]);
    ws.addRow(['Costo',        fmt(c.cost)]);
    ws.addRow(['Precio',       fmt(c.price)]);
    ws.addRow(['Operador',     c.supplier || '']);
  }

  // ── Sheet 7: Seguro ───────────────────────────────────────────
  if (quote.insurance.company) {
    const ws = wb.addWorksheet('Seguro');
    ws.columns = [{ width: 16 }, { width: 32 }];
    ws.addRow(['SEGURO DE VIAJE']);
    ws.addRow(['Compañía',   quote.insurance.company]);
    ws.addRow(['Plan',       quote.insurance.plan]);
    ws.addRow(['Cobertura',  quote.insurance.coverage]);
    ws.addRow(['Costo',      fmt(quote.insurance.cost)]);
    ws.addRow(['Precio',     fmt(quote.insurance.price)]);
    ws.addRow(['Operador',   quote.insurance.supplier || '']);
  }

  // ── Descargar ─────────────────────────────────────────────────
  const filename = `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}-${quote.client.name.replace(/\s+/g, '-')}.xlsx`;
  const buffer   = await wb.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);
}
