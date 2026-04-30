## Objetivo

Agregar un nuevo segmento **Cumpleaños** en el dashboard (al lado de Recordatorios, Alertas operativas y Vuelos próximos) que liste los clientes cumpleañeros, y permitir enviar un saludo por **WhatsApp** desde la app, con mensaje **personalizable** y **plantilla guardable**.

---

## 1. Nuevo widget: `BirthdayWidget`

Archivo: `src/components/dashboard/BirthdayWidget.tsx`

Comportamiento:
- Lee `clients` (paginado con `.range()` por la regla de >1000 filas) trayendo `id, name, birth_date, phone`.
- Calcula tres grupos:
  - **Hoy** (mes y día = hoy) — destacado
  - **Esta semana** (próximos 7 días)
  - **Este mes** (resto del mes)
- Cada item muestra: nombre, fecha (`d MMM`), edad que cumple, y dos acciones:
  - **WhatsApp** (verde, ícono) → abre diálogo de envío
  - **Ver cliente** → navega a `/clients?highlight={name}`
- Si el cliente no tiene `phone`, el botón WhatsApp queda deshabilitado con tooltip "Sin teléfono".
- Estilo y estructura idénticos a `OperationalAlertsWidget` (Card, secciones colapsadas, badge con total, `Skeleton` mientras carga).
- Respeta `settings.notify_birthdays` (si está apagado, el widget no se renderiza).

## 2. Diálogo de envío por WhatsApp

Archivo: `src/components/dashboard/BirthdayWhatsAppDialog.tsx`

- `Dialog` con:
  - Textarea editable precargada con la plantilla del usuario.
  - Variables disponibles (chips clickeables que insertan en cursor): `{{nombre}}`, `{{primer_nombre}}`, `{{edad}}`, `{{agencia}}`.
  - Vista previa del mensaje renderizado.
  - Checkbox **"Guardar como plantilla por defecto"**.
  - Botón **Enviar por WhatsApp** → abre `https://wa.me/{phone}?text={encodeURIComponent(mensaje)}` en nueva pestaña.
- Validación con Zod: mensaje no vacío, máximo 1000 caracteres.
- Sanitización del teléfono: solo dígitos, asume formato internacional (si arranca con `0` o no tiene código de país, mostrar advertencia "Verificá el código de país").

## 3. Plantilla persistente

Reutilizamos `user_settings` (ya existe vía `SettingsContext`). Agregamos dos campos opcionales:

```sql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS birthday_whatsapp_template text
    DEFAULT '¡Feliz cumpleaños, {{primer_nombre}}! 🎉 Te deseamos un día increíble. Saludos, {{agencia}}.',
  ADD COLUMN IF NOT EXISTS birthday_whatsapp_country_code text DEFAULT '54';
```

Migración + tipo en `SettingsContext` (`birthday_whatsapp_template`, `birthday_whatsapp_country_code`) y método `updateSettings` ya soporta el patch.

## 4. Configuración en `NotificationsTab`

En `src/components/settings/NotificationsTab.tsx`, dentro del bloque de "🎂 Cumpleaños":
- Cuando `notify_birthdays` está activo, mostrar:
  - Textarea con la plantilla por defecto del mensaje WhatsApp + chips de variables.
  - Input de **Código de país por defecto** (ej. `54` para Argentina), usado cuando el teléfono del cliente no lo tiene.
  - Botón "Restaurar plantilla original".

## 5. Integración en Dashboard

`src/pages/Dashboard.tsx` línea 364–368: ampliar la grilla a 4 columnas (`lg:grid-cols-4` o pasar a `xl:grid-cols-4` según viewport) e insertar `<BirthdayWidget />` al final.

```tsx
<div className="mb-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
  <RemindersPanel />
  <OperationalAlertsWidget />
  <UpcomingFlightsWidget />
  <BirthdayWidget />
</div>
```

## 6. Limpieza del `BirthdayNotifier`

Mantener el toast de cumpleaños del día (es complementario, dispara una sola vez por sesión), pero ahora el widget es la fuente principal de visibilidad y acción.

---

## Detalles técnicos

- **Edad**: `differenceInYears(today, parseISO(birth_date))` — usar `parseISO` de `date-fns` (regla del proyecto sobre timezones).
- **Orden**: Hoy → próximos por fecha ascendente.
- **Render variables**: helper `renderTemplate(tmpl, ctx)` que reemplaza `{{var}}` por valores del cliente + agencia (de `useAuth`/agency context).
- **WhatsApp link**: `https://wa.me/` requiere número en formato internacional sin `+` ni espacios. Si el `phone` del cliente no empieza con dígito de país, prependemos `birthday_whatsapp_country_code`.
- **Seguridad**: usamos `encodeURIComponent` sobre el mensaje antes de armar la URL. No se hace fetch al servidor — se delega a WhatsApp Web/App.
- **Multi-tenant**: la consulta a `clients` ya filtra por `agency_id` vía RLS existente.
- **Permisos**: el widget es visible a `admin` y `vendedor` (los vendedores también atienden a sus clientes).

---

## Archivos a crear / modificar

- **Crear**: `src/components/dashboard/BirthdayWidget.tsx`
- **Crear**: `src/components/dashboard/BirthdayWhatsAppDialog.tsx`
- **Crear**: `src/lib/birthdayTemplate.ts` (helper `renderTemplate` + `buildWhatsAppUrl`)
- **Migración**: agregar `birthday_whatsapp_template` y `birthday_whatsapp_country_code` a `user_settings`
- **Modificar**: `src/contexts/SettingsContext.tsx` (tipo + defaults)
- **Modificar**: `src/components/settings/NotificationsTab.tsx` (UI de plantilla)
- **Modificar**: `src/pages/Dashboard.tsx` (grilla 4 columnas + import widget)

---

## Resultado esperado

En el dashboard, al lado de los demás widgets, aparece **🎂 Cumpleaños** con los clientes de hoy / esta semana / este mes. Un click en el ícono de WhatsApp abre un diálogo con el mensaje precargado, editable, con variables; al confirmar se abre WhatsApp con el saludo listo para enviar al número del cliente. La plantilla queda guardada para próximos saludos.
