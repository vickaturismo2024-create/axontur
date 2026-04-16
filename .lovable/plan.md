
User wants to change which currencies show: Dollar Oficial, Blue, MEP, EUR, BRL (5 cards instead of 6 — remove USD Tarjeta).

Current widget has: oficial, blue, bolsa (MEP), tarjeta, EUR, BRL.

Change: Remove `tarjeta` from `USD_KEYS`, adjust grid from `lg:grid-cols-6` to `lg:grid-cols-5`.

## Plan: Ajustar monedas mostradas en el widget

### Cambio
Quitar **USD Tarjeta** del widget. Quedan 5 tarjetas exactamente en el orden pedido:

1. USD Oficial
2. USD Blue (destacado en dorado)
3. USD MEP
4. EUR Oficial
5. BRL Oficial

### Archivo a editar
`src/components/dashboard/CurrencyRatesWidget.tsx`
- `USD_KEYS`: `['oficial', 'blue', 'bolsa']` (sacar `'tarjeta'`).
- Grilla: `lg:grid-cols-5` en lugar de `lg:grid-cols-6` para que las 5 tarjetas ocupen el ancho de forma pareja en desktop. Mobile sigue en 2 columnas, tablet en 3.
- Skeleton loader: 5 placeholders en vez de 6.

Sin cambios de API ni de lógica de fetch (los endpoints ya devuelven todo, solo filtramos distinto).
