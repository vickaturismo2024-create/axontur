# Arreglar "Enviar por WhatsApp" en Compartir presupuesto

## Problema detectado

En el menú **Compartir → Enviar por WhatsApp** del PDF de presupuesto, hacer clic no abre nada (ni WhatsApp, ni error). El teléfono del cliente está bien cargado (ej. `+54 9 11 1234-5678`).

**Causa raíz:** el handler usa `window.open(url, '_blank')` dentro de un `DropdownMenuItem` de Radix. Radix cierra el menú de forma asíncrona después del clic, y para cuando se ejecuta `window.open`, el navegador ya considera que perdió el "user gesture" original → **bloquea la apertura como popup, silenciosamente, sin error**. El mismo botón "Enviar por Email" funciona porque `mailto:` no se considera popup.

## Solución

Cambiar el item de WhatsApp para que use un enlace real (`<a href="https://wa.me/...">`) en vez de un `onClick` con `window.open`. Los navegadores siempre permiten la navegación de un `<a target="_blank">` aunque el menú se cierre, porque la URL ya está resuelta en el DOM en el momento del clic.

### Cambios

**1. `src/components/pdf/PDFShareMenu.tsx`**
- Calcular el `whatsappUrl` y la validez del teléfono al renderizar (no en un handler).
- Reemplazar el `DropdownMenuItem onClick={handleShareWhatsApp}` por un `DropdownMenuItem asChild` que envuelve un `<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">`.
- Si el teléfono es inválido, en vez de no renderizar, dejar el item como botón con `onClick` que muestra el toast de error (caso poco frecuente, pero útil).
- Mantener el resto del menú igual.

**2. Aplicar el mismo patrón (defensivo) en otros lugares donde se usa `window.open('https://wa.me/...')` dentro de menús/popovers**, para evitar el mismo bug a futuro:
- `src/components/dashboard/BirthdayWhatsAppDialog.tsx` (revisar si está dentro de un Dialog que se cierra antes de abrir)
- `src/components/pdf/PDFContactPage.tsx` y `PDFContactPages.tsx` (botones de agentes — probablemente ya funcionan porque son botones directos, pero verificar)

Solo se cambiará el comportamiento donde haga falta; no se tocan los otros si ya funcionan.

## Detalle técnico

```tsx
// Antes
<DropdownMenuItem onClick={handleShareWhatsApp}>
  <MessageCircle /> Enviar por WhatsApp
</DropdownMenuItem>

// Después
const phoneDigits = normalizePhoneForWhatsApp(quote.client.phone || '', defaultCountryCode);
const phoneValid = phoneDigits.length >= 8 && phoneDigits.length <= 15;
const whatsappMessage = `¡Hola ${quote.client.name}! ...`;
const whatsappUrl = phoneValid 
  ? buildWhatsAppUrl(phoneDigits, whatsappMessage) 
  : null;

{whatsappUrl ? (
  <DropdownMenuItem asChild>
    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="gap-2 cursor-pointer flex items-center">
      <MessageCircle className="h-4 w-4 text-green-600" /> Enviar por WhatsApp
    </a>
  </DropdownMenuItem>
) : (
  <DropdownMenuItem onClick={() => toast.error('El cliente no tiene un teléfono válido para WhatsApp')}>
    <MessageCircle className="h-4 w-4 text-green-600" /> Enviar por WhatsApp
  </DropdownMenuItem>
)}
```

## Resultado esperado

Hacer clic en **Compartir → Enviar por WhatsApp** abre `wa.me/<número>` en una pestaña nueva con el mensaje pre-cargado, sin bloqueo de popup.

## Archivos a modificar

- `src/components/pdf/PDFShareMenu.tsx` (cambio principal)
- (Opcional, solo si reproducimos el bug ahí) `src/components/dashboard/BirthdayWhatsAppDialog.tsx`
