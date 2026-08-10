// Simular el parseo de fechas de FlightImporter.tsx
const year = 2026;
const month = 8;
const day = 4;
const hours = 23; // Probamos a las 23:00 para ver si cambia de día
const minutes = 30;

console.log("=== PRUEBA DE ZONA HORARIA LOCAL ===");
console.log(`Input simulado: ${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} a las ${hours}:${minutes} hs\n`);

// 1. Comportamiento ANTERIOR (Forzando UTC)
const dateUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes));
console.log(`[ANTERIOR - CON Date.UTC]`);
console.log(`- ISO String (Lo que se guarda en BD): ${dateUTC.toISOString()}`);
console.log(`- getHours() (Hora interpretada por la PC): ${dateUTC.getHours()}`);
console.log(`- getDate() (Día interpretado por la PC): ${dateUTC.getDate()}\n`);

// 2. Comportamiento ACTUAL (Local)
const dateLocal = new Date(year, month - 1, day, hours, minutes);
console.log(`[NUEVO - SIN FORZAR UTC (Usando huso del dispositivo)]`);
console.log(`- ISO String (Lo que se guarda en BD): ${dateLocal.toISOString()}`);
console.log(`- getHours() (Hora interpretada por la PC): ${dateLocal.getHours()}`);
console.log(`- getDate() (Día interpretado por la PC): ${dateLocal.getDate()}\n`);

// 3. Funciones de UI en FlightImporter.tsx
const formatDateValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTimeValue = (date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
};

console.log(`[FORMATEO EN INPUTS UI (Lo que ve el usuario)]`);
console.log(`- Fecha en pantalla: ${formatDateValue(dateLocal)}`);
console.log(`- Hora en pantalla: ${formatTimeValue(dateLocal)}`);
