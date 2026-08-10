const { validateImportedReservation } = require('./src/lib/importValidators.ts');

// Mock data with multiple errors:
// 1. Missing supplier in service 1
// 2. Duplicate passengers
// 3. Overpayment in USD
// 4. Inverted start/end dates
const testData = {
  legacyId: '12345',
  clientName: 'Juan Pérez',
  startDate: '2026-10-15',
  endDate: '2026-10-10', // Error: Inverted dates!
  currency: 'USD',
  passengers: [
    { name: 'Maria Gomez', type: 'ADULTO' },
    { name: 'Maria Gomez', type: 'ADULTO' } // Error: Duplicate passenger!
  ],
  services: [
    { supplierName: 'Sin Proveedor', description: 'Hotel Paris', price: 1000, currency: 'USD' }, // Error: No supplier
    { supplierName: 'Iberia', description: 'Vuelo MAD-EZE', price: 500, currency: 'USD' }
  ],
  receipts: [
    { concept: 'Cobro total', amount: 2000, currency: 'USD' } // Error: Overpayment ($2000 > $1500)
  ],
  payments: []
};

console.log('=== TEST MOTOR DE VALIDACIONES (importValidators) ===');
const warnings = validateImportedReservation(testData);

console.log(`Advertencias encontradas: ${warnings.length}`);
warnings.forEach((w, i) => {
  console.log(`${i+1}. [${w.severity.toUpperCase()}] (${w.type}): ${w.message}`);
});

if (warnings.length >= 4) {
  console.log('\n✅ ÉXITO: El motor de validaciones detectó correctamente todas las incongruencias.');
} else {
  console.log('\n❌ ERROR: Faltaron advertencias por detectar.');
}
