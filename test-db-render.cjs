const { parseISO, format } = require('date-fns');

// 1. Simular la creación de la fecha en el frontend (Ej. Input = 2026-08-04 a las 23:30 hs)
const inputDate = new Date(2026, 7, 4, 23, 30); // Mes 7 = Agosto

// 2. Simular lo que hace useFlightReservations.ts antes de guardar en Supabase
function toLocalISOString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

const dbString = toLocalISOString(inputDate);
console.log("=== FLUJO DE GUARDADO Y LECTURA ===");
console.log(`1. Fecha ingresada en frontend: 2026-08-04 a las 23:30 hs`);
console.log(`2. String enviado y guardado en Supabase (toLocalISOString): ${dbString}\n`);

// 3. Simular la lectura en componentes de UI (Ej. ReservationDetail.tsx)
const readDateNative = new Date(dbString);
console.log(`[Componente ReservationDetail.tsx]`);
console.log(`- String de DB: ${dbString}`);
console.log(`- Leído como Date nativo: ${readDateNative.toString()}`);
console.log(`- formateado con getHours(): ${readDateNative.getHours()}:${readDateNative.getMinutes()}`);

// 4. Simular lectura en Calendar.tsx con date-fns
const readDateDateFns = parseISO(dbString);
console.log(`\n[Componente Calendar.tsx]`);
console.log(`- Leído con parseISO(): ${readDateDateFns.toString()}`);
console.log(`- Formateado con date-fns format(HH:mm): ${format(readDateDateFns, 'HH:mm')}`);

// CONCLUSIÓN DE LA PRUEBA
if (readDateNative.getHours() === 23 && format(readDateDateFns, 'HH:mm') === '23:30') {
    console.log(`\n✅ RESULTADO: ÉXITO. La zona horaria se visualiza perfectamente en todo el sistema sin corrimientos de horario.`);
} else {
    console.log(`\n❌ ERROR: Hay un desfasaje en la visualización. (Horas resultantes: ${readDateNative.getHours()} y ${format(readDateDateFns, 'HH:mm')})`);
}
