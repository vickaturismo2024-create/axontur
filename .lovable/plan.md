Voy a corregirlo desde la causa real, no sólo desde la vista previa.

Plan:

1. **Alinear datos reales de plantilla y agencia**
   - Hacer que el template cargue y guarde correctamente `agencyName`, `agencyPhone`, `agencyInstagram`, `agencyTagline` y `footerText`.
   - Confirmar que los campos vacíos no vuelvan a rellenarse con textos demo ni con el nombre de la plantilla.

2. **Corregir el PDF privado y el PDF público**
   - En la vista interna/exportación, el banner tomará: datos de plantilla → datos de Configuración → vacío.
   - En el link público (`/pdf/:id`), agregar el mapeo que hoy falta para `agency_name`, `agency_phone`, `agency_instagram` y `agency_tagline`; ahora el público recibe esos datos desde la base pero el frontend no los convierte, por eso publicado puede verse viejo o incompleto.

3. **Eliminar contenido viejo ya guardado en la base**
   - Limpiar plantillas existentes que todavía tienen `footerText` con `+54 11 2345-6789`, `@vickaturismo` o textos heredados.
   - Limpiar WhatsApp agents de prueba con `5491123456789` cuando sean datos placeholder, sin tocar los teléfonos reales ya cargados (`549223...`).
   - Completar el teléfono del banner desde Configuración de agencia cuando la plantilla lo tenga vacío.

4. **Sincronizar la vista previa con el render real**
   - Ajustar `TemplatePreviewPanel` para que no use `footerText` viejo como sustituto del banner si hay campos de agencia.
   - Que el preview muestre/oculte exactamente lo mismo que el PDF real: chips sólo si hay valor, banner omitido si no hay datos.

5. **Verificación antes de terminar**
   - Buscar en todo el código que no quede `1123456789`, `+54 11 2345-6789`, `@vickaturismo` ni `Tu viaje soñado...` como fallback visible del PDF/plantillas.
   - Revisar una consulta de base para confirmar que la plantilla predeterminada ya no conserva el footer viejo ni teléfonos inventados.
   - Indicar que después de aprobar e implementar hay que republicar para que la próxima publicación lleve el fix.