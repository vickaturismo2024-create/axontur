

## Plan: Iteración 1 de mejoras de Claude (AxonTur)

Vamos a ejecutar **Bloques 1 + 4 + 2 + 5** del análisis, con ajustes a la realidad del proyecto.

### Ajustes al plan original de Claude

- **Email**: usamos la infraestructura nativa de **Lovable Cloud** (no Resend). Esto evita pedirte cuentas externas y API keys; el remitente y dominio se configuran desde Cloud → Emails.
- **`as any` en Supabase**: Claude detectó 2 archivos pero en realidad hay **~31 archivos con `as any`**. Casi todos existen porque las tablas no están en el archivo de tipos auto-generado. La limpieza correcta es **regenerar los tipos** (lo hace la plataforma sola al correr migraciones); luego van cayendo solos. Voy a quitar los `as any` cuando los tipos estén disponibles, no a mano.
- **`strictNullChecks`**: lo activo y dedico un paso completo a arreglar los errores que aparezcan.

### BLOQUE 1 — Fixes técnicos

1. **Vaciar `src/App.css`** (deja un comentario explicando por qué quedó vacío).
2. **`index.html`**: cambiar `lang="en"` → `lang="es"` y quitar el TODO genérico del título.
3. **TypeScript strict**: en `tsconfig.json` y `tsconfig.app.json` activar `strictNullChecks: true` y `noImplicitAny: true`. Luego recorrer los errores que tire `tsc --noEmit` y arreglarlos uno por uno (foco esperado: `FileReceiptsTab`, `NewMovementDialog`, `FileSuppliersTab`, `Accounts`, `FileFinancialSummary`).
4. **Limpieza de `as any` legítimos**: una vez aplicadas las migraciones del Bloque 2 (estado de recibos, `receipt_id` en movimientos), los tipos se regeneran y los `as any` de esas tablas se quitan.

### BLOQUE 4 — Infraestructura de Email (Lovable Cloud)

1. **Setup email infra** de Cloud (crea cola, log de envíos, tabla de supresión, edge function `process-email-queue`, cron).
2. **Verificación de dominio**: si todavía no tenés un dominio configurado para emails, te abro el diálogo de setup; si ya lo tenés, sigo. Mientras DNS se verifica, los emails se encolan.
3. **`src/lib/emailTemplates.ts`** con 3 templates HTML inline (Gmail/Outlook compatibles): `reservationConfirmationTemplate`, `receiptEmailTemplate`, `supplierVoucherTemplate`. Mismos campos que propuso Claude.
4. **`src/lib/emailService.ts`**: wrapper que invoca la edge function de envío de Cloud + helper `getAgencyInfo()` que lee de `profiles`.
5. **Tabla `email_logs`** (preparada para el Bloque 8 más adelante): `id`, `user_id`, `file_id` nullable, `to_email`, `subject`, `template_type`, `sent_at`, `status`. RLS por `user_id`. Cada envío exitoso se loguea acá.

### BLOQUE 2 — Recibos mejorados

**Migración Supabase:**
- Agregar a `file_receipts`: `status` enum (`draft` / `issued` / `paid` / `cancelled`), default `issued`.
- Agregar a `account_movements`: columna `receipt_id uuid` nullable + FK a `file_receipts(id) ON DELETE SET NULL`.
- Función SQL `next_receipt_number(p_user_id uuid) returns int` con `SELECT COALESCE(MAX(receipt_number), 0) + 1 FROM file_receipts WHERE user_id = p_user_id` dentro de transacción + lock para evitar duplicados.

**Frontend `FileReceiptsTab.tsx`:**
- Numeración correlativa **global por agencia** vía la función SQL nueva (no más por expediente).
- `Badge` de estado con colores: gris/azul/verde/rojo tachado.
- Menú compacto al lado del badge para transicionar `draft → issued → paid`, y opción separada "Anular" con `AlertDialog`.
- Botón "Enviar por email" funcional (ver Bloque 5).
- Borrado en cascada: al eliminar un recibo, borra `file_receipt_items` Y `account_movements` con `receipt_id = recibo.id`.

**`receiptPdfUtils.ts` rediseñado:**
- Header con logo + nombre + CUIT de la agencia (lee de `profiles`).
- N° de recibo grande tipo monoespaciada.
- Cliente con CUIT/CUIL si está cargado.
- Tabla de líneas: monto, moneda, método, cotización.
- Total en letras (helper `numeroALetras`).
- Pie con datos de contacto.
- Marca de agua diagonal "ANULADO" si `status === 'cancelled'`.
- Mantiene el patrón de 2 copias (Agencia/Cliente) en A4 con línea de corte (memoria existente).

**Integración Recibos ↔ Cuentas Corrientes (Bloque 3 parcial):**
- Al guardar recibo: cada item genera un movimiento en `account_movements` con `receipt_id = recibo.id`, vinculado al `client_id` del expediente.
- En `FileFinancialSummary`: el campo "Cobrado" suma items de recibos con status `issued` o `paid` (excluye `draft` y `cancelled`).
- En `Accounts.tsx`: ícono de recibo en movimientos con `receipt_id` y link al expediente correspondiente.

### BLOQUE 5 — Botones de Email en la UI

- **`FileReceiptsTab`**: botón Mail por recibo → Dialog con email del cliente pre-completado, asunto pre-completado, checkbox "incluir desglose en el cuerpo", `Enviar` invoca `sendEmail()` con `receiptEmailTemplate`. Loading + toast de éxito/error. Loguea en `email_logs`.
- **`FileDetail.tsx`**: `DropdownMenu` con ícono Mail en el header, opciones:
  - "Enviar confirmación al cliente" → `reservationConfirmationTemplate`
  - "Enviar voucher a operador" → sub-diálogo para elegir proveedor/servicio + email destino → `supplierVoucherTemplate`
- **`ReservationDetail.tsx`**: botón "Enviar confirmación por email" en el header.

### Lo que NO entra en esta iteración

Bloques 3 (parte de configuración avanzada de cuentas corrientes), 6 (Settings de email), 7 (React Query/skeleton/paginación), 8 (estados de expediente, dashboard de alertas, tab Comunicaciones, exportar pasajeros, notas internas) y 9 (mejoras de proveedores) **quedan para iteraciones siguientes**. Cuando termine ésta te aviso y elegís qué bloque sigue.

### Detalles técnicos

````text
nuevos:
  src/lib/emailTemplates.ts
  src/lib/emailService.ts
  supabase/migrations/<ts>_receipts_status_and_email_logs.sql

modificados:
  src/App.css                              (vaciar)
  index.html                               (lang="es")
  tsconfig.json, tsconfig.app.json         (strictNullChecks, noImplicitAny)
  src/components/files/FileReceiptsTab.tsx (status, badges, email, cascade)
  src/components/files/receiptPdfUtils.ts  (rediseño completo)
  src/components/files/FileFinancialSummary.tsx (filtro por status)
  src/pages/Accounts.tsx                   (link a expediente desde recibo)
  src/pages/FileDetail.tsx                 (dropdown Mail)
  src/pages/ReservationDetail.tsx          (botón email)
  + archivos varios donde aparezcan errores de strictNullChecks

infraestructura:
  Lovable Cloud → Email (setup_email_infra + verificación de dominio si falta)
````

### Verificación

- TypeScript compila sin errores con strict activado.
- App.css vacío no rompe ninguna pantalla.
- Crear un recibo nuevo → numeración global incremental, badge visible, movimiento en cuenta corriente con `receipt_id`.
- Cambiar estado del recibo → badge actualiza, "Cobrado" en resumen financiero refleja el cambio.
- Anular recibo → marca de agua "ANULADO" en PDF, no se cuenta en "Cobrado".
- Borrar recibo → desaparecen sus movimientos en `account_movements`.
- Click "Enviar email" en recibo → dialog → envío → toast éxito → fila en `email_logs`.
- Dropdown Mail en FileDetail → enviar confirmación al cliente y voucher a operador funcionan.

