## Problema

En `PDFShareMenu.tsx` (botón "Enviar por WhatsApp" del presupuesto), el código actual es muy ingenuo:

```ts
window.open(`https://wa.me/${quote.client.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
```

Falla cuando:
- El cliente no tiene teléfono cargado → abre `https://wa.me/?text=...` (WhatsApp no encuentra contacto y no pasa nada / pantalla en blanco).
- El teléfono no tiene código de país (ej. `11 3333-4444`) → wa.me lo rechaza o abre un chat inválido.
- El teléfono empieza con `0` o `00` (formato local/internacional viejo) → genera un número incorrecto.
- No hay feedback al usuario cuando algo falla, parece que "no funciona".

Mientras tanto, el dialog de cumpleaños (`BirthdayWhatsAppDialog`) ya usa `normalizePhoneForWhatsApp` con código de país por defecto desde Settings, y funciona bien.

## Solución

Reutilizar la misma lógica de normalización en el menú de compartir del presupuesto.

### Cambios en `src/components/pdf/PDFShareMenu.tsx`

1. Importar `normalizePhoneForWhatsApp` y `buildWhatsAppUrl` desde `@/lib/birthdayTemplate`.
2. Importar `useSettings` para leer `birthday_whatsapp_country_code` (mismo setting que ya configura el usuario, "código de país por defecto").
3. Reescribir `handleShareWhatsApp`:
   - Normalizar el teléfono del cliente con el código de país por defecto.
   - Si queda vacío o con longitud inválida (<8 o >15 dígitos) → mostrar `toast.error("El cliente no tiene un teléfono válido para WhatsApp")` y abortar.
   - Si OK → construir URL con `buildWhatsAppUrl` y abrir.

### Resultado esperado

- Si el cliente tiene teléfono válido → abre WhatsApp correctamente con el mensaje y el enlace al PDF.
- Si el teléfono es local sin código de país → se le antepone el código por defecto (ej. `54`) configurado en Ajustes → Notificaciones.
- Si no hay teléfono → toast claro indicando el problema, sin pantallazo en blanco.

## Detalles técnicos

- Sin cambios de DB ni de edge functions.
- Sin cambios de UI más allá del handler.
- El código de país sigue siendo configurable desde Ajustes → Notificaciones (campo ya existente).
