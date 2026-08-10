const { parseISO, format } = require('date-fns');

// 1. Simulación de un Timestamp AUTO-GENERADO por Supabase (UTC absoluto)
// Imagina que alguien aprieta "Guardar Reserva" justo a esta hora UTC.
// 2026-08-04T16:30:00.000Z equivale a las 13:30 hs en Argentina (GMT-3)
const dbCreatedAt = "2026-08-04T16:30:00.000Z";

console.log("=== PRUEBA DE HORARIOS AUTO-GENERADOS (ej. created_at) ===");
console.log(`1. Supabase genera automáticamente (UTC): ${dbCreatedAt}\n`);

// 2. Cómo lo lee el frontend usando Date nativo (ej. ReservationDetail.tsx línea 286)
const dateNative = new Date(dbCreatedAt);
console.log(`[Lectura Nativa en Frontend]`);
console.log(`- Objeto Date: ${dateNative.toString()}`);
console.log(`- Hora detectada localmente (getHours): ${dateNative.getHours()}:${String(dateNative.getMinutes()).padStart(2,'0')}`);

// 3. Cómo lo lee el frontend usando date-fns (ej. Calendar.tsx o format)
const dateDateFns = parseISO(dbCreatedAt);
console.log(`\n[Lectura con date-fns (Librería de formateo UI)]`);
console.log(`- Objeto Date: ${dateDateFns.toString()}`);
console.log(`- Hora formateada para la UI (HH:mm): ${format(dateDateFns, 'HH:mm')}`);

if (dateNative.getHours() === 13 && format(dateDateFns, 'HH:mm') === '13:30') {
    console.log(`\n✅ ÉXITO: El sistema frontend toma el horario global UTC (16:30) y lo convierte perfectamente a la zona horaria del usuario (13:30) al momento de renderizar.`);
} else {
    console.log(`\n❌ ERROR: El horario no se está adaptando al dispositivo del usuario.`);
}
