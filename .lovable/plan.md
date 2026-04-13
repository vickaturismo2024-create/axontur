

# Plan: Ocultar viajes finalizados del calendario

## Problema
El calendario muestra todos los viajes aprobados, incluyendo los que ya terminaron. Solo debería mostrar viajes en curso o futuros.

## Cambio

| Archivo | Cambio |
|---|---|
| `src/pages/Calendar.tsx` | En el filtro `activeQuotes`, agregar condición: `parseISO(q.trip.endDate) >= startOfToday()` para excluir viajes cuya fecha de fin ya pasó |

Un cambio de una línea en el filtro existente.

