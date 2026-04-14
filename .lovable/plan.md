

# Plan: Recibo PDF doble con logo y diseño de marca

## Resumen

Rediseñar `generateReceiptPDF` para que genere dos copias idénticas del recibo en una sola hoja A4 (mitad superior e inferior), incluyendo el logo de la agencia y un diseño profesional con colores de marca.

## Cambios

### 1. `src/components/files/receiptPdfUtils.ts` — Reescribir completo

- Agregar `logo_url` al interface `Agency`
- Crear función interna `drawReceipt(doc, receipt, agency, yOffset)` que dibuje un recibo en una posición Y dada dentro de la mitad de página (~148mm cada mitad)
- Llamar `drawReceipt` dos veces: una con offset 0 (mitad superior) y otra con offset ~148mm (mitad inferior)
- Dibujar línea de corte punteada en el medio de la hoja
- **Logo**: Cargar la imagen con `fetch` + `FileReader` para convertir a base64, luego usar `doc.addImage()` en la esquina superior izquierda de cada copia
- **Diseño de marca**: Usar franja de color en el header (azul oscuro por defecto), líneas decorativas con color acento, tipografía más profesional

### 2. `src/components/files/FileReceiptsTab.tsx` — Pasar logo_url

- En `downloadReceipt`, incluir `logo_url` del perfil al construir el objeto `agency`
- Cambiar `generateReceiptPDF` a `async` ya que necesita cargar la imagen del logo

### Diseño del recibo (cada mitad ~148mm)

```text
┌─────────────────────────────────────┐
│ [LOGO]   NOMBRE AGENCIA             │
│          Dir | Tel | CUIT | Email    │
│ ─────────────────────────────────── │
│          RECIBO N° 0001              │
│ Fecha:     xx/xx/xxxx                │
│ Cliente:   Nombre                    │
│ Concepto:  Texto                     │
│ Método:    Transferencia             │
│ ─────────────────────────────────── │
│ TOTAL:              USD 1.500,00     │
│ Observaciones: ...                   │
│ ___________      ___________         │
│ Firma Agencia    Firma Cliente       │
├─ ─ ─ ─ ─ ─ ─ ─ CORTAR ─ ─ ─ ─ ─ ─ ┤
│ [misma copia repetida abajo]         │
└─────────────────────────────────────┘
```

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/files/receiptPdfUtils.ts` | Reescribir: recibo doble, logo, diseño de marca |
| `src/components/files/FileReceiptsTab.tsx` | Pasar `logo_url`, hacer `downloadReceipt` async |

