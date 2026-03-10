

# Fix: Google Maps URL + Mapa real en el PDF

## Problema 1: URL de Google Maps incorrecta

La función `getMapsUrl` solo usa `lodging.address` (ej: "Balcarce 700"), sin incluir la ciudad/destino. Esto hace que Google Maps encuentre cualquier "Balcarce 700" del país.

**Fix**: Concatenar `lodging.destination` (o `quote.trip.destination`) con la dirección:

```typescript
const getMapsUrl = (address: string, destination?: string) => {
  const fullAddress = destination ? `${address}, ${destination}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
};
```

Aplicar en `PDFContactPages.tsx` (línea 45-46 y línea 121) y `PDFContactPage.tsx` (línea 22-23).

## Problema 2: Mapa real en vez de placeholder

Actualmente el PDF muestra un placeholder con un ícono de MapPin y un degradado. Es posible reemplazarlo con una imagen estática de mapa real usando **OpenStreetMap tiles** via el servicio gratuito de **StaticMapLite** o directamente una imagen de **Google Maps Static API**.

**Opción recomendada**: Usar una imagen embed de OpenStreetMap que no requiere API key. Se puede construir una URL de imagen estática con servicios como `https://staticmap.openstreetmap.de/staticmap.php` que es gratis, o usar un `<iframe>` embed de OpenStreetMap/Google Maps.

**Enfoque**: Usar un `<iframe>` de Google Maps embed (gratis, sin API key) con la dirección completa. Es la solución más simple y confiable:

```html
<iframe 
  src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
  width="100%" 
  height="100px"
  style={{ border: 0, borderRadius: '8px' }}
/>
```

### Archivos a modificar

1. **`src/components/pdf/PDFContactPages.tsx`**:
   - Actualizar `getMapsUrl` para incluir `destination`
   - Reemplazar el placeholder de mapa con un `<iframe>` de Google Maps embed
   - Pasar `destination` del lodging o `quote.trip.destination` como fallback

2. **`src/components/pdf/PDFContactPage.tsx`** (legacy):
   - Mismos cambios para mantener consistencia

### Limitación
Los iframes de mapa no se renderizan al imprimir (print/PDF). Para print, se puede mantener el placeholder como fallback. En la vista web (PublicPDF y ExportPDF) se verá el mapa real interactivo.

