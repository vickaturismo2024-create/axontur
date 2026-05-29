## Problema

En el banner final del PDF (`PDFContactPages.tsx`, sección "agency"):

1. El título usa `template.agencyName || template.name` → cuando no se cargó nombre de agencia en la plantilla, se ve el nombre interno de la plantilla ("Plantilla Vicka Turismo Clasica"). Eso no debería verse nunca en el PDF del cliente.
2. El teléfono `+54 11 2345-6789`, el Instagram `@vickaturismo` y el tagline `Tu viaje soñado, nuestra pasión` están **hardcodeados** en el JSX. No vienen de ningún lado configurable.

La info real de contacto ya existe en Configuración → Agencia (`agency_name`, `phone`, `email`, `website`, etc. vía `SettingsContext`), pero el PDF no la consume.

## Solución

### 1. Extender `Template.styles` (opcional, backwards-compat)
En `src/types/quote.ts` agregar campos opcionales al banner de contacto:
- `agencyPhone?: string`
- `agencyInstagram?: string` (handle sin `@`)
- `agencyTagline?: string`

Quedan en `Template` (no en `styles`) junto a `agencyName` y `footerText`, que ya son nivel raíz.

### 2. Editor en `src/pages/Templates.tsx`
En la sección donde hoy se edita `agencyName` / `footerText`, agregar 3 inputs nuevos: Teléfono, Instagram, Tagline (frase corta del banner). Todos opcionales. Placeholder con el valor de la agencia (`settings.phone`, etc.) como hint visual.

### 3. Defaults desde Configuración → Agencia
En `PDFContactPages.tsx` usar este orden de precedencia para cada campo:
1. Valor de la plantilla si está cargado
2. Valor de `SettingsContext` (agencia) si existe
3. Si no hay ninguno → **no renderizar** ese ítem (no mostrar placeholder ni icono)

Para el título del banner: `template.agencyName || settings.agency_name`. Si tampoco hay agency_name, ocultar el bloque de título (nunca caer a `template.name`).

### 4. Render condicional del banner
- Si no hay título ni teléfono ni Instagram ni tagline → **omitir la sección "agency"** por completo.
- Cada chip (Phone / Instagram) se renderiza sólo si su valor existe.
- El tagline se muestra sólo si está definido.

### 5. Sincronizar preview
`TemplatePreviewPanel.tsx` debe reflejar lo mismo (mismas precedencias, mismas omisiones) para que lo que se ve en el editor coincida con el PDF real.

## Archivos a tocar

- `src/types/quote.ts` — 3 campos opcionales nuevos en `Template`.
- `src/pages/Templates.tsx` — 3 inputs nuevos + hints con valores de la agencia.
- `src/components/pdf/PDFContactPages.tsx` — sacar hardcodes, usar template + settings con fallback, render condicional.
- `src/components/templates/TemplatePreviewPanel.tsx` — espejar el mismo render condicional.

## Lo que NO se toca

- Schema de DB (los campos viven en el JSON de `template`, que ya es flexible).
- Lógica de presupuestos, mails, edge functions.
- Otros bloques del PDF (portada, detalles, itinerario).
