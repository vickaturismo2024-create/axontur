export interface ImportWarning {
  id: string;
  type: 'currency' | 'total' | 'duplicate' | 'date' | 'supplier' | 'flight' | 'overpayment';
  severity: 'high' | 'medium' | 'low';
  message: string;
  details?: string;
}

export interface LegacyPassengerValidationInput {
  name: string;
  type?: string;
  dni?: string | null;
  birthDate?: string | null;
}

export interface LegacyServiceValidationInput {
  supplierName?: string;
  description?: string;
  serviceType?: string;
  startDate?: string | null;
  endDate?: string | null;
  cost?: number;
  price?: number;
  currency?: string;
  origin?: string | null;
  destination?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
}

export interface LegacyReceiptValidationInput {
  concept?: string;
  date?: string | null;
  amount?: number;
  currency?: string;
}

export interface LegacyPaymentValidationInput {
  supplierName?: string;
  date?: string | null;
  amount?: number;
  currency?: string;
}

export interface LegacyReservationValidationInput {
  legacyId?: string;
  clientName?: string;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  passengers?: LegacyPassengerValidationInput[];
  services?: LegacyServiceValidationInput[];
  receipts?: LegacyReceiptValidationInput[];
  payments?: LegacyPaymentValidationInput[];
}

/**
 * Valida la estructura de una reserva/expediente importado y devuelve una lista de advertencias.
 */
export function validateImportedReservation(data: LegacyReservationValidationInput): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  if (!data) {
    return [{
      id: 'empty_data',
      type: 'total',
      severity: 'high',
      message: 'No se encontraron datos para validar.'
    }];
  }

  // 1. Moneda ambigüa o no especificada
  if (!data.currency) {
    warnings.push({
      id: 'missing_main_currency',
      type: 'currency',
      severity: 'high',
      message: 'La reserva no tiene una moneda principal especificada (ARS/USD).'
    });
  }

  (data.services || []).forEach((s, idx) => {
    if (!s.currency) {
      warnings.push({
        id: `svc_missing_curr_${idx}`,
        type: 'currency',
        severity: 'medium',
        message: `El servicio #${idx + 1} ("${s.description || 'Sin descripción'}") no tiene moneda definida. Se asumió ${data.currency || 'USD'}.`
      });
    }
  });

  // 2. Falta de Proveedor
  (data.services || []).forEach((s, idx) => {
    const supp = (s.supplierName || '').trim();
    if (!supp || supp.toUpperCase() === 'S/D' || supp.toUpperCase() === 'SIN PROVEEDOR') {
      warnings.push({
        id: `svc_no_supplier_${idx}`,
        type: 'supplier',
        severity: 'high',
        message: `El servicio #${idx + 1} ("${s.description || 'Sin descripción'}") no tiene un proveedor asignado.`
      });
    }
  });

  // 3. Duplicados: Pasajeros repetidos
  const passengerNames = new Set<string>();
  (data.passengers || []).forEach((p, idx) => {
    const normName = (p.name || '').toLowerCase().trim();
    if (normName) {
      if (passengerNames.has(normName)) {
        warnings.push({
          id: `pax_dup_${idx}`,
          type: 'duplicate',
          severity: 'medium',
          message: `Pasajero duplicado detectado: "${p.name}".`
        });
      } else {
        passengerNames.add(normName);
      }
    }
  });

  // 4. Duplicados: Vuelos / Servicios idénticos
  const serviceSignatures = new Set<string>();
  (data.services || []).forEach((s, idx) => {
    const sig = `${s.supplierName || ''}|${s.description || ''}|${s.startDate || ''}|${s.price || 0}|${s.currency || ''}`;
    if (serviceSignatures.has(sig)) {
      warnings.push({
        id: `svc_dup_${idx}`,
        type: 'duplicate',
        severity: 'medium',
        message: `Servicio posiblemente duplicado (#${idx + 1}): "${s.description || s.supplierName}".`
      });
    } else {
      serviceSignatures.add(sig);
    }
  });

  // 5. Incongruencias Temporales (Fechas)
  if (data.startDate && data.endDate) {
    if (new Date(data.startDate) > new Date(data.endDate)) {
      warnings.push({
        id: `reservation_date_inverted`,
        type: 'date',
        severity: 'high',
        message: `La fecha de inicio de la reserva (${data.startDate}) es posterior a la fecha de fin (${data.endDate}).`
      });
    }
  }

  (data.services || []).forEach((s, idx) => {
    if (s.startDate && s.endDate) {
      if (new Date(s.startDate) > new Date(s.endDate)) {
        warnings.push({
          id: `svc_date_inverted_${idx}`,
          type: 'date',
          severity: 'high',
          message: `El servicio #${idx + 1} ("${s.description}") tiene fecha de inicio posterior a la fecha de fin.`
        });
      }
    }
  });

  // 6. Validación de Cobros vs Totales (Sobrepagos)
  const totalUsdPrice = (data.services || [])
    .filter(s => (s.currency || data.currency || 'USD') === 'USD')
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const totalArsPrice = (data.services || [])
    .filter(s => (s.currency || data.currency || 'USD') === 'ARS')
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const totalUsdReceipts = (data.receipts || [])
    .filter(r => (r.currency || data.currency || 'USD') === 'USD')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalArsReceipts = (data.receipts || [])
    .filter(r => (r.currency || data.currency || 'USD') === 'ARS')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  if (totalUsdReceipts > totalUsdPrice + 0.01 && totalUsdPrice > 0) {
    warnings.push({
      id: `overpayment_usd`,
      type: 'overpayment',
      severity: 'medium',
      message: `Los recibos en USD (USD ${totalUsdReceipts.toFixed(2)}) superan el total vendido en USD (USD ${totalUsdPrice.toFixed(2)}).`
    });
  }

  if (totalArsReceipts > totalArsPrice + 0.01 && totalArsPrice > 0) {
    warnings.push({
      id: `overpayment_ars`,
      type: 'overpayment',
      severity: 'medium',
      message: `Los recibos en ARS ($ ${totalArsReceipts.toFixed(2)}) superan el total vendido en ARS ($ ${totalArsPrice.toFixed(2)}).`
    });
  }

  return warnings;
}
