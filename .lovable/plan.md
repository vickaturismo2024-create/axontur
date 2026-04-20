

## Plan: hacer el parser de itinerario tolerante a separadores y formatos

### Problema
El regex actual exige `Día` y `fecha` pegados sin separador. Cuando el texto se copia desde la web/PDF de la naviera, suelen aparecer espacios normales, **non-breaking spaces** (`\u00A0`), tabs o saltos de línea entre los campos. Resultado: 0 puertos detectados aunque el texto se vea idéntico.

### Cambios en `src/lib/cruiseItineraryParser.ts`

1. **Normalización previa al parseo:**
   - Reemplazar todos los whitespace "raros" (`\u00A0`, `\u2007`, `\u202F`, `\u200B`, tabs, newlines) por espacios normales.
   - Colapsar espacios múltiples a uno solo.

2. **Regex más tolerante de día+fecha:**
   ```
   /(Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b|Dom)\.?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi
   ```
   - Acepta abreviatura con o sin punto (`Sab` / `Sáb.`).
   - Acepta 0 o más espacios entre día y fecha.
   - Acepta 1-2 dígitos en día/mes y 2 o 4 en año.

3. **Regex de horarios más tolerante:**
   - Aceptar `HH:MM`, `HHhMM`, `H:MM`, y guiones tipo `–` (en-dash) o `—` (em-dash) además del `-` normal.

4. **Limpieza post-parseo:**
   - Trim de puerto/país.
   - Si el "puerto" quedó vacío pero la fecha es válida, igualmente generar la fila (con texto `(sin nombre)`) para que el usuario lo vea y corrija, en vez de fallar silencioso.

5. **Mensaje de error más útil:**
   - Si no se detectan puertos, mostrar en el dialog las primeras ~200 chars normalizadas (con espacios visibles como `·`) para que el usuario o vos puedan diagnosticar al toque.

### Archivos afectados
````text
modificados:
  src/lib/cruiseItineraryParser.ts                       (normalización + regex tolerante)
  src/components/quotes/CruiseItineraryPasteDialog.tsx   (mostrar muestra normalizada en error)
````

### Verificación
- Volver a pegar el mismo texto que falló → debe detectar los 10 puertos.
- Probar variantes: con NBSP, con espacios entre día/fecha/puerto, con tildes (`Sáb`, `Mié`), con guiones `–`.
- Si el formato real sigue sin matchear, el mensaje de error mostrará el texto normalizado y podemos ajustar el regex con esa muestra exacta.

