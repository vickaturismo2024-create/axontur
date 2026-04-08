

# Plan: Nuevas funcionalidades para profesionalizar la app

## Funcionalidades propuestas

### Prioridad Alta

#### 1. Multi-usuario y perfiles de agencia
Crear una tabla `profiles` con datos de la agencia (nombre, logo, teléfono, dirección, CUIT). Mostrar una página "Mi Agencia" donde el usuario configure sus datos, que se usen automáticamente en los presupuestos y plantillas.
- Nueva tabla `profiles` con RLS
- Nueva página `/settings` o `/agency`
- Auto-completar datos de agencia en nuevas plantillas

#### 2. Clientes recurrentes (CRM básico)
Guardar los datos de clientes en una tabla `clients` para reutilizarlos. Al crear un presupuesto, poder seleccionar un cliente existente o crear uno nuevo. Ver historial de presupuestos por cliente.
- Nueva tabla `clients` (name, email, phone, notes, user_id)
- Autocompletado en el formulario de cliente del presupuesto
- Página `/clients` con lista y detalle

#### 3. Duplicar plantilla
Botón para clonar una plantilla existente y editarla sin modificar la original. Simple pero muy útil.
- Botón en `Templates.tsx`
- Reutilizar lógica similar a `duplicateQuote`

#### 4. Historial de versiones visible
Ya se guardan versiones en la base de datos, pero no hay UI para verlas ni restaurarlas. Agregar un panel en el editor con lista de versiones y botón "Restaurar".
- Nuevo componente `VersionHistoryPanel`
- Integrar en `QuoteEditor.tsx`

### Prioridad Media

#### 5. Pagos y seguimiento financiero
Agregar un registro de pagos por presupuesto: monto, fecha, método, estado (pendiente/confirmado). Mostrar saldo pendiente.
- Nueva tabla `payments` (quote_id, amount, currency, date, method, status, user_id)
- Sección de pagos en el editor del presupuesto
- Badge de "Pagado" / "Saldo pendiente" en el dashboard

#### 6. Exportar presupuesto a Excel
Generar un archivo .xlsx con el desglose del presupuesto (costos, precios, márgenes) para uso interno de la agencia.
- Botón en el menú de compartir
- Usar librería `xlsx` para generar el archivo

#### 7. Notificaciones por email
Al compartir un presupuesto, enviar automáticamente un email al cliente con el enlace. Usar una Edge Function con Resend.
- Edge function `send-quote-email`
- Botón "Enviar por email" en PDFShareMenu

### Prioridad Baja

#### 8. Calendario de viajes
Vista de calendario que muestre los viajes de todos los presupuestos activos, con fechas de vuelos, check-in/out de hoteles, etc.
- Nueva página `/calendar`
- Usar librería de calendario (react-big-calendar o similar)

#### 9. Plantillas prediseñadas
Incluir 3-4 plantillas de ejemplo con estilos profesionales listos para usar, que el usuario pueda importar y personalizar.
- Seed data con plantillas prediseñadas
- Botón "Importar plantilla" en Templates

---

## Resumen

| # | Funcionalidad | Complejidad | Impacto |
|---|--------------|-------------|---------|
| 1 | Perfiles de agencia | Media | Alto |
| 2 | CRM de clientes | Media | Alto |
| 3 | Duplicar plantilla | Baja | Medio |
| 4 | Historial de versiones UI | Media | Alto |
| 5 | Pagos y seguimiento | Media | Alto |
| 6 | Exportar a Excel | Baja | Medio |
| 7 | Email al compartir | Media | Medio |
| 8 | Calendario de viajes | Alta | Medio |
| 9 | Plantillas prediseñadas | Baja | Medio |

## Archivos nuevos estimados
- `src/pages/Agency.tsx` — Perfil de agencia
- `src/pages/Clients.tsx` — CRM de clientes
- `src/components/quotes/VersionHistory.tsx` — Panel de versiones
- `src/components/quotes/PaymentsSection.tsx` — Registro de pagos
- Edge function `send-quote-email` — Envío de emails
- 3 migraciones SQL (profiles, clients, payments)

¿Cuáles te gustaría implementar? Podemos arrancar con todas o elegir las que más te interesen.

