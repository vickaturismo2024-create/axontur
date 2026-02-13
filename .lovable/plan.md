
# Nombre de agencia configurable

## Problema

"Vicka Turismo" esta escrito directamente en el codigo en varios lugares: el header de la app, las paginas PDF de contacto, la portada (fallback sin logo), y los mensajes de email al compartir. Si otra agencia quiere usar el sistema, no puede cambiar ese nombre sin modificar el codigo.

## Solucion

Agregar un campo `agency_name` a la tabla `templates` y al tipo `Template`, y reemplazar todas las referencias hardcodeadas de "Vicka Turismo" para que usen el nombre configurado en la plantilla.

Para el Header (que no tiene acceso a una plantilla especifica), se usara el nombre de la plantilla por defecto del usuario.

---

## Cambios

### 1. Migracion de base de datos

Agregar columna `agency_name` a la tabla `templates`:

```sql
ALTER TABLE public.templates 
ADD COLUMN agency_name TEXT DEFAULT 'Mi Agencia';
UPDATE public.templates SET agency_name = 'Vicka Turismo' WHERE agency_name = 'Mi Agencia';
```

### 2. Tipo `Template` en `src/types/quote.ts`

Agregar el campo `agencyName: string` a la interfaz `Template`.

### 3. Contexto `QuotesContext.tsx`

Actualizar los helpers `dbToTemplate` y `templateToDb` para mapear `agency_name` a `agencyName`.

### 4. Componentes PDF (usar `template.agencyName`)

- **PDFCoverPage.tsx**: Reemplazar "Vicka Turismo" (linea 92) con `template.agencyName || template.name`
- **PDFContactPage.tsx**: Reemplazar "Vicka Turismo" (linea 240) con `template.agencyName`
- **PDFContactPages.tsx**: Reemplazar "Vicka Turismo" (linea 261) con `template.agencyName`
- **PDFShareMenu.tsx**: Reemplazar "Vicka Turismo" en el email (linea 46). Requiere recibir `template` como prop adicional.

### 5. Header (`src/components/layout/Header.tsx`)

Importar `useQuotes` y mostrar `getDefaultTemplate()?.agencyName || 'Generador de Presupuestos'` en lugar de "Vicka Turismo".

### 6. Pagina de Templates (`src/pages/Templates.tsx`)

Agregar un campo de texto "Nombre de agencia" en el editor de plantillas, junto a los demas campos existentes, para que el usuario pueda configurar este valor.

### 7. Demo data (`src/data/demoData.ts`)

Agregar `agencyName: 'Vicka Turismo'` a la plantilla por defecto para mantener retrocompatibilidad.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| Migracion SQL | Nueva columna `agency_name` |
| `src/types/quote.ts` | Agregar `agencyName` a `Template` |
| `src/contexts/QuotesContext.tsx` | Mapear `agency_name` en helpers |
| `src/components/pdf/PDFCoverPage.tsx` | Usar `template.agencyName` |
| `src/components/pdf/PDFContactPage.tsx` | Usar `template.agencyName` |
| `src/components/pdf/PDFContactPages.tsx` | Usar `template.agencyName` |
| `src/components/pdf/PDFShareMenu.tsx` | Recibir template, usar `agencyName` |
| `src/components/layout/Header.tsx` | Mostrar nombre de agencia dinamico |
| `src/pages/Templates.tsx` | Campo editable para nombre de agencia |
| `src/data/demoData.ts` | Agregar `agencyName` al default |
| `src/pages/ExportPDF.tsx` | Pasar template a PDFShareMenu |
