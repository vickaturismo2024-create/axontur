

## Plan: cotizaciones en tiempo real desde 0223.com.ar

### Fuente
`https://www.0223.com.ar/dolar` — HTML público con estas cotizaciones:

| Moneda | Compra | Venta |
|---|---|---|
| Dólar Oficial | ✓ | ✓ |
| Dólar Blue | ✓ | ✓ |
| Euro | ✓ | ✓ |
| Euro Blue | ✓ | ✓ |
| Real (BRL) | ✓ | ✓ |
| Peso Chileno (CLP) | ✓ | ✓ |
| Bitcoin (USD) | — | ✓ |

No expone API JSON; hay que scrapear el HTML. Además el browser bloquea por CORS, así que el fetch va por edge function.

### Cambios

**1. Nueva edge function `fetch-currency-rates`** (`supabase/functions/fetch-currency-rates/index.ts`)
- Pública (`verify_jwt = false` en `supabase/config.toml`).
- `GET` sin parámetros → hace `fetch` a `https://www.0223.com.ar/dolar`, parsea el HTML con regex específicos por sección (busca cada bloque `<li>` con título "Dólar", "Dólar Blue", "Euro", etc., y extrae los dos `$X.XXX,XX` que siguen).
- Devuelve JSON normalizado:
  ```json
  {
    "updatedAt": "2026-04-20T...",
    "source": "0223.com.ar",
    "rates": [
      { "key": "usd_oficial", "label": "USD Oficial", "compra": 1345, "venta": 1395 },
      { "key": "usd_blue",    "label": "USD Blue",    "compra": 1385, "venta": 1405 },
      { "key": "eur_oficial", "label": "EUR Oficial", "compra": 1684.29, "venta": 1688.03 },
      { "key": "eur_blue",    "label": "EUR Blue",    "compra": 1628.76, "venta": 1652.28 },
      { "key": "brl",         "label": "BRL",         "compra": 275.71, "venta": 275.88 },
      { "key": "clp",         "label": "CLP",         "compra": 1.5592, "venta": 1.5592 },
      { "key": "btc_usd",     "label": "Bitcoin",     "compra": null,   "venta": 75379, "currency": "USD" }
    ]
  }
  ```
- Cache en memoria 5 min (variable módulo) para no martillar al sitio si se llama mucho.
- CORS habilitado.
- Si el parseo falla (cambian el HTML), responde 502 con detalle para debugging.

**2. Refactor del widget** (`src/components/dashboard/CurrencyRatesWidget.tsx`)
- Reemplazo del `fetch` directo a `dolarapi.com` por `supabase.functions.invoke('fetch-currency-rates')`.
- Sigue usando `useQuery` con `staleTime: 5min`, `refetchInterval: 5min`, botón manual de refresh y "Actualizado hace X" — mismo diseño visual exacto.
- Muestra las 7 cotizaciones (USD Oficial, USD Blue destacado, EUR Oficial, EUR Blue, BRL, CLP, BTC). Bitcoin se renderiza con etiqueta especial "USD" abajo en vez de "Compra $X" porque solo trae venta.
- Grid se ajusta a 2 / 3 / 4 columnas (mobile / tablet / desktop) para que entren las 7 prolijas.

### Archivos
````text
nuevos:
  supabase/functions/fetch-currency-rates/index.ts

modificados:
  src/components/dashboard/CurrencyRatesWidget.tsx   (cambiar fuente + soportar 7 monedas)
  supabase/config.toml                                (registrar fetch-currency-rates con verify_jwt=false)
````

### Consideraciones
- **Rate limiting / cortesía**: cache de 5 min en la edge function evita pegarle al sitio en cada refetch del usuario.
- **Robustez**: si el HTML cambia y un parser falla, devuelvo las monedas que sí pude extraer (no rompo el widget entero).
- **Tiempo real**: refetch automático cada 5 min + al volver al tab + botón manual. No hay WebSocket porque el sitio no lo expone.
- **Atribución**: agrego una línea chica abajo del widget: *Fuente: 0223.com.ar*.

### Verificación
- Abrir Dashboard → ver las 7 cotizaciones con los valores actuales del sitio.
- Click en refresh → spinner + valores actualizados.
- Esperar 5 min con tab activo → refetch automático.
- Ver "Actualizado hace X minutos" sincronizado con el último fetch.

