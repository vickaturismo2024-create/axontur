import * as XLSX from 'xlsx';
import { Quote } from '@/types/quote';

export function exportQuoteToExcel(quote: Quote) {
  const wb = XLSX.utils.book_new();
  const currency = quote.trip.currency || 'USD';
  const fmt = (n?: number) => n ?? 0;

  // Sheet 1: Resumen
  const resumen = [
    ['PRESUPUESTO DE VIAJE - RESUMEN INTERNO'],
    [],
    ['Cliente', quote.client.name],
    ['Email', quote.client.email],
    ['Teléfono', quote.client.phone],
    [],
    ['Destino', quote.trip.destination],
    ['Fecha inicio', quote.trip.startDate],
    ['Fecha fin', quote.trip.endDate],
    ['Viajeros', quote.trip.travelers],
    ['Moneda', currency],
    ['Estado', quote.status],
    [],
    ['DESGLOSE FINANCIERO'],
    ['Concepto', 'Costo', 'Precio', 'Margen', 'Margen %'],
  ];

  const breakdown = quote.pricing.breakdown;
  if (breakdown) {
    const categories = [
      { name: 'Vuelos', data: breakdown.flights },
      { name: 'Alojamiento', data: { cost: 0, price: 0 } },
      { name: 'Traslados', data: breakdown.transfers },
      { name: 'Trenes', data: breakdown.trains },
      { name: 'Ferrys', data: breakdown.ferries },
      { name: 'Autos', data: breakdown.rentalCars },
      { name: 'Actividades', data: breakdown.activities },
      { name: 'Crucero', data: breakdown.cruise },
      { name: 'Seguro', data: breakdown.insurance },
    ];
    // Calculate lodging
    const lodgings = quote.lodgings?.length ? quote.lodgings : (quote.lodging?.name ? [quote.lodging] : []);
    const lodgingCost = lodgings.reduce((s, l) => s + fmt(l.totalCost || (l.costPerNight || 0) * (l.nights || 0)), 0);
    const lodgingPrice = lodgings.reduce((s, l) => s + fmt(l.totalPrice || (l.pricePerNight || 0) * (l.nights || 0)), 0);
    categories[1].data = { cost: lodgingCost, price: lodgingPrice };

    let totalCost = 0, totalPrice = 0;
    categories.forEach(c => {
      const margin = c.data.price - c.data.cost;
      const pct = c.data.cost > 0 ? (margin / c.data.cost * 100) : 0;
      resumen.push([c.name, c.data.cost, c.data.price, margin, Math.round(pct)] as any);
      totalCost += c.data.cost;
      totalPrice += c.data.price;
    });
    resumen.push([]);
    const totalMargin = totalPrice - totalCost;
    const totalPct = totalCost > 0 ? (totalMargin / totalCost * 100) : 0;
    resumen.push(['TOTAL', totalCost, totalPrice, totalMargin, Math.round(totalPct)] as any);
    resumen.push(['Por persona', Math.round(totalCost / (quote.trip.travelers || 1)), Math.round(totalPrice / (quote.trip.travelers || 1))] as any);
  }

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Sheet 2: Vuelos
  if (quote.flights.length > 0) {
    const flightRows = [['Origen', 'Destino', 'Fecha', 'Aerolínea', 'Vuelo', 'Equipaje', 'Costo', 'Precio', 'Operador']];
    quote.flights.forEach(f => {
      flightRows.push([f.origin, f.destination, f.date, f.airline, f.flightNumber, f.luggage, fmt(f.cost), fmt(f.price), f.supplier || ''] as any);
    });
    const ws = XLSX.utils.aoa_to_sheet(flightRows);
    ws['!cols'] = Array(9).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Vuelos');
  }

  // Sheet 3: Alojamiento
  const lodgings = quote.lodgings?.length ? quote.lodgings : (quote.lodging?.name ? [quote.lodging] : []);
  if (lodgings.length > 0) {
    const rows = [['Hotel', 'Categoría', 'Destino', 'Check-in', 'Check-out', 'Noches', 'Habitación', 'Régimen', 'Costo', 'Precio', 'Operador']];
    lodgings.forEach(l => {
      rows.push([l.name, l.category, l.destination || '', l.checkIn, l.checkOut, l.nights, l.roomType, l.regime, fmt(l.totalCost || (l.costPerNight || 0) * l.nights), fmt(l.totalPrice || (l.pricePerNight || 0) * l.nights), l.supplier || ''] as any);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = Array(11).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Alojamiento');
  }

  // Sheet 4: Transportes
  const allTransports = [
    ...quote.transfers.map(t => ({ tipo: 'Traslado', desc: t.description, fecha: t.dateTime, costo: fmt(t.cost), precio: fmt(t.price), operador: t.supplier || '', incluido: t.included })),
    ...(quote.trains || []).map(t => ({ tipo: 'Tren', desc: `${t.origin} → ${t.destination}`, fecha: t.date, costo: fmt(t.cost), precio: fmt(t.price), operador: t.supplier || '', incluido: t.included })),
    ...(quote.ferries || []).map(f => ({ tipo: 'Ferry', desc: `${f.origin} → ${f.destination}`, fecha: f.date, costo: fmt(f.cost), precio: fmt(f.price), operador: f.supplier || '', incluido: f.included })),
    ...(quote.rentalCars || []).map(r => ({ tipo: 'Auto', desc: `${r.company} - ${r.carType}`, fecha: r.pickupDate, costo: fmt(r.cost), precio: fmt(r.price), operador: r.supplier || '', incluido: r.included })),
  ];
  if (allTransports.length > 0) {
    const rows = [['Tipo', 'Descripción', 'Fecha', 'Incluido', 'Costo', 'Precio', 'Operador']];
    allTransports.forEach(t => {
      rows.push([t.tipo, t.desc, t.fecha, t.incluido ? 'Sí' : 'No', t.costo, t.precio, t.operador] as any);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = Array(7).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, 'Transportes');
  }

  // Sheet 5: Actividades
  if (quote.activities && quote.activities.length > 0) {
    const rows = [['Actividad', 'Fecha', 'Hora', 'Ubicación', 'Incluida', 'Costo', 'Precio', 'Operador']];
    quote.activities.forEach(a => {
      rows.push([a.name, a.date, a.time, a.location, a.included ? 'Sí' : 'No', fmt(a.cost), fmt(a.price), a.supplier || ''] as any);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = Array(8).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
  }

  // Sheet 6: Crucero
  if (quote.cruise) {
    const c = quote.cruise;
    const rows = [
      ['CRUCERO'],
      ['Barco', c.shipName],
      ['Compañía', c.company],
      ['Cabina', `${c.cabinType} - ${c.cabinNumber}`],
      ['Embarque', `${c.embarkationPort} (${c.embarkationDate})`],
      ['Desembarque', `${c.disembarkationPort} (${c.disembarkationDate})`],
      ['Noches', c.nights],
      ['Costo', fmt(c.cost)],
      ['Precio', fmt(c.price)],
      ['Operador', c.supplier || ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows as any);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Crucero');
  }

  // Sheet 7: Seguro
  if (quote.insurance.company) {
    const rows = [
      ['SEGURO DE VIAJE'],
      ['Compañía', quote.insurance.company],
      ['Plan', quote.insurance.plan],
      ['Cobertura', quote.insurance.coverage],
      ['Costo', fmt(quote.insurance.cost)],
      ['Precio', fmt(quote.insurance.price)],
      ['Operador', quote.insurance.supplier || ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows as any);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Seguro');
  }

  const filename = `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}-${quote.client.name.replace(/\s+/g, '-')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
