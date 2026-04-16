

## Plan: Diagnosticar y arreglar el importador de Excel

### Causa probable
`parse_document` sobre `LISRESERVA3.xlsx` devuelve únicamente `ID_RES` como contenido, lo que sugiere que:
- El archivo tiene **múltiples hojas** y la activa/primera está vacía o solo contiene `ID_RES`, mientras la data real está en otra hoja, **o**
- La hoja tiene **filas de título mergeadas arriba** y los headers reales (`NOM_CLI`, `NOM_OPE`, etc.) están en la fila 2/3/4, no en la 1, **o**
- Hay **filtros/filas ocultas** que el parser no atraviesa.

El parser actual (`src/lib/reservationExcelParser.ts`) hace `workbook.Sheets[workbook.SheetNames[0]]` con `sheet_to_json` por defecto → asume header en la primera fila de la primera hoja. Si cualquiera de los supuestos arriba falla, devuelve 0 filas → "No se encontraron expedientes".

### Pasos al pasar a default mode

1. **Inspeccionar el archivo real** copiándolo a `/tmp` y leyéndolo con `openpyxl` + `pandas` para listar:
   - Todas las hojas y sus dimensiones.
   - Las primeras 10 filas de cada hoja (cell-level con `openpyxl`) para detectar dónde están los headers reales.
   - Si hay filas/columnas ocultas o filtros activos.

2. **Hacer el parser robusto** en `src/lib/reservationExcelParser.ts`:
   - Recorrer **todas las hojas** del workbook, no solo la primera.
   - **Auto-detectar la fila de headers**: leer las primeras ~10 filas en bruto y elegir la fila que contenga `ID_RES` (case-insensitive, sin acentos) como header. Pasar `range: <rowIdx>` a `sheet_to_json`.
   - Normalizar headers: trimmear, lowercase, quitar acentos, y mapear sinónimos (`ID_RES` / `id_res` / `Id Res` / `NRO_RES` / `Nº Res` → `ID_RES`).
   - Aceptar filas donde `ID_RES` venga como número o string.
   - Loggear en consola la hoja elegida, fila de headers detectada y conteo de filas para que el usuario tenga visibilidad si vuelve a fallar.
   - Si tras todo eso `reservations.length === 0`, mostrar en el toast un mensaje útil: "No se encontró la columna ID_RES. Hojas detectadas: X, Y. Headers vistos: ..." en vez del genérico actual.

3. **Mejorar el feedback en el dialog** (`ImportFilesExcelDialog.tsx`):
   - Mostrar en el área de upload el nombre del archivo y, si falla, un panel con el detalle del error (hojas/headers detectados) sin tener que abrir DevTools.

### Archivos a tocar
| Archivo | Cambio |
|---|---|
| `src/lib/reservationExcelParser.ts` | Multi-hoja + auto-detección de fila de headers + normalización de nombres + retorno de diagnóstico |
| `src/components/files/ImportFilesExcelDialog.tsx` | Mostrar diagnóstico cuando 0 expedientes detectados |

### Si tras la inspección vemos que el archivo está realmente vacío o roto
Te aviso con el detalle exacto (hojas, filas, primeras celdas) y pedimos un Excel nuevo o que reexportes desde el sistema antiguo.

