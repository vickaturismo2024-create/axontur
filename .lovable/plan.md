

# Plan: Agregar campo `supplier` a todos los schemas de validación

## Problema raíz

El campo `supplier` se **elimina silenciosamente** cada vez que se guarda un presupuesto. Esto pasa porque Zod (la librería de validación) **descarta los campos que no están definidos en el schema**. Ninguno de los schemas de servicios (vuelos, transfers, trenes, ferries, autos, actividades, cruceros, seguros, alojamientos) tiene el campo `supplier` declarado.

Entonces: el usuario asigna un proveedor → el auto-save o guardado manual ejecuta `validateQuote()` → Zod elimina `supplier` del objeto → se guarda sin proveedor → los reportes no muestran nada.

## Solución

Agregar `supplier: z.string().optional()` a cada schema de servicio en `src/lib/validations.ts`.

## Cambios

| Archivo | Cambio |
|---|---|
| `src/lib/validations.ts` | Agregar `supplier: z.string().optional()` a: `flightSchema`, `transferSchema`, `trainSchema`, `ferrySchema`, `rentalCarSchema`, `activitySchema`, `cruiseSchema`, `insuranceSchema`, `lodgingSchema` (9 schemas) |

Es un cambio de una sola línea en 9 lugares del mismo archivo. Después de esto, el proveedor se va a guardar correctamente y los reportes van a funcionar.

