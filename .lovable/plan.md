

# Plan: Corregir métrica de valor + brainstorm de mejoras

## 1. Corregir la métrica "Valor total" en el Dashboard

### Cambio en `src/pages/Dashboard.tsx`
- Reemplazar el cálculo de `totalsByCurrency` para que:
  - Solo considere presupuestos con `status === 'approved'`
  - En lugar de sumar `totalPrice`, sume el **margen de ganancia** (`totalPrice - totalCost`)
  - Solo incluya quotes donde tanto `totalCost` como `totalPrice` sean > 0
- Cambiar el label de "Valor total" a "Ganancia aprobados"
- Cambiar el ícono si es necesario (o mantener DollarSign que tiene sentido)

### Lógica actual (líneas 71-75):
```typescript
// ANTES: suma totalPrice de todos los activos
activeQuotes.forEach(q => {
  totalsByCurrency[currency] += q.pricing.totalPrice;
});
```

### Lógica nueva:
```typescript
// DESPUÉS: suma margen solo de aprobados
activeQuotes
  .filter(q => q.status === 'approved' && q.pricing.totalCost > 0 && q.pricing.totalPrice > 0)
  .forEach(q => {
    const margin = q.pricing.totalPrice - q.pricing.totalCost;
    marginByCurrency[currency] += margin;
  });
```

## Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/pages/Dashboard.tsx` | Cambiar cálculo de la métrica de valor total → ganancia de aprobados |

---

## Ideas de mejoras futuras para discutir

Además de este fix, acá van algunas ideas de funcionalidades nuevas:

1. **Exportación de reportes a Excel/PDF** — Descargar los datos de la página de Reportes como archivo
2. **Notas internas por cliente** — Mini CRM con historial de interacciones dentro de cada ficha de cliente
3. **Notificaciones por email** — Alertas automáticas cuando un presupuesto es aprobado o un documento está por vencer
4. **Comparador de presupuestos** — Poner dos presupuestos lado a lado para comparar precios y servicios
5. **Dashboard personalizable** — Que el usuario elija qué métricas ver en el hero del dashboard

