

## Plan: Iteración 3 — Bloques 6 + 9 + 3 avanzado

Continuamos con tres bloques que completan el ERP operativo: settings de email, mejoras de proveedores y extractos avanzados de cuentas corrientes.

### BLOQUE 6 — Configuración de Email

**1. Nueva pestaña "Email" en Settings**
Agregar a `Settings.tsx` una pestaña que permita configurar:
- **Firma de email** (textarea, multilínea con HTML básico permitido).
- **Email de respuesta** (`reply_to`) opcional.
- **Plantillas personalizables** por tipo (`receipt`, `confirmation`, `voucher`):
  - Asunto editable con variables `{cliente}`, `{expediente}`, `{numero_recibo}`.
  - Cuerpo editable con las mismas variables.
  - Botón "Restaurar por defecto".
- **Vista previa** con datos de ejemplo.

**2. Migración**
Agregar a `profiles`:
- `email_signature` (text)
- `email_reply_to` (text)
- `email_templates` (jsonb): `{ receipt: {subject, body}, confirmation: {...}, voucher: {...} }`

**3. Integración**
Modificar `src/lib/emailTemplates.ts` y `emailService.ts` para que:
- Lea las plantillas custom del perfil del usuario antes de aplicar las defaults.
- Reemplace variables `{cliente}`, `{expediente}`, `{numero_recibo}`, `{monto}`, `{moneda}`.
- Anexe la firma al final del cuerpo.

### BLOQUE 9 — Mejoras de Proveedores

**1. Tipos predefinidos de proveedor**
Hoy `suppliers.type` es texto libre. Agregar:
- Select con opciones: `Aerolínea`, `Hotel`, `Operador`, `Cruceros`, `Asistencia`, `Traslados`, `Excursiones`, `Otro`.
- Mantener compatibilidad con valores libres existentes.

**2. Vista detalle de proveedor**
Nueva ruta `/suppliers/:id` con:
- Datos generales editables.
- Lista de **servicios usados** (`file_services` filtrados por `supplier_id`).
- Lista de **pagos realizados** (`file_supplier_payments` filtrados por `supplier_id`).
- **Saldo actual** por moneda.
- Métrica: facturación total YTD por moneda + cantidad de expedientes asociados.

**3. Notas y archivos adjuntos**
- Editor de notas en supplier (autoguardado).
- (Adjuntos quedan para una iteración futura — necesitan storage bucket dedicado).

**4. Filtro por tipo en Suppliers.tsx**
Tabs/select de tipo arriba del listado.

### BLOQUE 3 — Cuentas Corrientes Avanzado

**1. Filtros en AccountDetail**
- Rango de fechas (date pickers desde/hasta).
- Filtro por tipo de movimiento (`debit` / `credit` / `all`).
- Filtro por moneda (cuando hay movimientos en >1 moneda).
- Buscador por concepto/referencia.

**2. Exportar extracto a Excel**
Botón en `AccountDetail.tsx` que genera Excel con:
- Encabezado: nombre del titular, tipo, moneda, período.
- Columnas: fecha, concepto, debe, haber, saldo, referencia, expediente.
- Saldo final destacado.

**3. Exportar extracto a PDF**
Botón que genera PDF imprimible con:
- Logo + datos de la agencia (de `profiles`).
- Mismas columnas que Excel pero formateadas como tabla.
- Footer legal del perfil.
- Reutiliza `jspdf` + `jspdf-autotable` (ya instalados).

**4. Resumen consolidado en Accounts.tsx**
Cards al tope de la página:
- Total **a cobrar** (suma de saldos positivos de clientes) por moneda.
- Total **a pagar** (suma de saldos pendientes a proveedores) por moneda.
- Movimientos del mes en curso.

### Lo que NO entra en esta iteración

- Verificación de dominio de email (pendiente del usuario).
- Adjuntos en proveedores (requiere storage bucket).
- Reportes avanzados de proveedores (un Bloque futuro).

### Detalles técnicos

````text
modificados:
  src/pages/Settings.tsx                     (nueva tab Email)
  src/pages/Suppliers.tsx                    (filtro por tipo, link a detalle)
  src/pages/Accounts.tsx                     (cards de resumen consolidado)
  src/components/accounts/AccountDetail.tsx  (filtros + export Excel/PDF)
  src/lib/emailTemplates.ts                  (lee templates custom)
  src/lib/emailService.ts                    (firma + reply_to)
  src/components/clients/ClientFormDialog.tsx (no aplica, es referencia)

nuevos:
  src/components/settings/EmailTab.tsx
  src/pages/SupplierDetail.tsx
  src/lib/exportAccountStatement.ts          (Excel + PDF)
  src/App.tsx                                (ruta /suppliers/:id)

migración:
  profiles.email_signature  (text)
  profiles.email_reply_to   (text)
  profiles.email_templates  (jsonb default)
````

### Verificación

- Tab Email en Settings carga, guarda y restaura defaults correctamente.
- Enviar un recibo o confirmación usa la plantilla custom + firma del perfil.
- `/suppliers/:id` muestra servicios, pagos y saldo por moneda.
- Filtro por tipo en Suppliers funciona.
- AccountDetail filtra por fecha, tipo y moneda; el saldo recalcula correctamente.
- Botones Exportar Excel/PDF descargan archivos con formato correcto.
- Cards de resumen en Accounts muestran totales por moneda.

