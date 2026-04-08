

# Plan: Nuevas funcionalidades para profesionalizar la app

## Funcionalidades propuestas

### Prioridad Alta

#### 1. Exportar presupuesto a Excel (.xlsx)
Generar un archivo Excel con desglose completo: vuelos, alojamientos, transportes, actividades, costos, precios, márgenes. Para uso interno de la agencia.
- Instalar librería `xlsx`
- Botón "Exportar Excel" en `PDFShareMenu`
- Genera archivo con múltiples hojas (Resumen, Vuelos, Alojamiento, Transportes, etc.)

#### 2. Duplicar plantilla
Botón para clonar una plantilla existente y editarla sin modificar la original.
- Agregar botón "Duplicar" en `Templates.tsx`
- Crear copia con nombre "Copia de [nombre]"

#### 3. Envío de presupuesto por email (transaccional)
Enviar el link del presupuesto directamente al email del cliente desde la app, con un diseño profesional.
- Requiere configurar un dominio de email (actualmente no hay ninguno configurado)
- Edge function `send-quote-email`
- Botón "Enviar por email" en `PDFShareMenu`

#### 4. Proveedores con gestión completa
Expandir la tabla `suppliers` para incluir contacto, tipo de servicio, notas. Permitir asociar proveedores a vuelos, hoteles y servicios para trazabilidad.
- Migración: agregar columnas `email`, `phone`, `type`, `notes` a `suppliers`
- Nueva página `/suppliers` con CRUD completo
- Selector de proveedor en cada sección del presupuesto

### Prioridad Media

#### 5. Calendario de viajes
Vista mensual que muestre todos los viajes activos con sus fechas, para planificación visual.
- Nueva página `/calendar`
- Implementar con CSS grid nativo (sin dependencias externas)
- Mostrar viajes como barras de color por destino

#### 6. Plantillas prediseñadas
Incluir 3-4 plantillas profesionales listas para usar que el usuario pueda importar.
- Seed data con estilos variados (elegante, moderno, minimalista, colorido)
- Botón "Importar plantilla" en Templates

#### 7. Dashboard de rentabilidad
Panel dedicado con métricas financieras detalladas: rentabilidad por destino, por cliente, evolución mensual, mejores clientes.
- Nuevos gráficos en `DashboardCharts`
- Análisis cruzado quotes + clients + payments

#### 8. Recordatorios y seguimiento
Sistema de recordatorios para seguimiento de presupuestos: "Llamar al cliente en 3 días", "Vence el presupuesto mañana".
- Nueva tabla `reminders` (quote_id, date, message, completed)
- Notificaciones en el dashboard
- Badge con cantidad de recordatorios pendientes en el header

### Prioridad Baja

#### 9. Múltiples monedas con conversión
Permitir mezclar monedas en un mismo presupuesto (vuelos en USD, hotel en EUR, transfers en ARS) con tipo de cambio configurable.
- Campo de moneda por servicio
- Tipo de cambio configurable en la sección de precios
- Conversión automática al total

#### 10. Firma digital del cliente
Permitir que el cliente "apruebe" el presupuesto desde el link público con una firma o botón de aceptación.
- Agregar sección de aprobación en `PublicPDF`
- Edge function para registrar la aprobación
- Cambio automático de estado a "Aprobado"

---

## Resumen

| # | Funcionalidad | Complejidad | Impacto |
|---|--------------|-------------|---------|
| 1 | Exportar a Excel | Baja | Alto |
| 2 | Duplicar plantilla | Baja | Medio |
| 3 | Email transaccional | Media | Alto |
| 4 | Gestión de proveedores | Media | Alto |
| 5 | Calendario de viajes | Media | Medio |
| 6 | Plantillas prediseñadas | Baja | Medio |
| 7 | Dashboard rentabilidad | Media | Alto |
| 8 | Recordatorios | Media | Alto |
| 9 | Multi-moneda con conversión | Alta | Medio |
| 10 | Firma digital del cliente | Media | Alto |

## Nota sobre email
Para el envío de emails transaccionales, primero necesitás configurar un dominio de email. Podés hacerlo desde la configuración del proyecto.

## Recomendación de orden
Arrancar con las de alta prioridad y baja complejidad (1, 2), luego las de alto impacto (4, 8, 10), y después las de medio impacto.

¿Cuáles te gustaría implementar?

