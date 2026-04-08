

# Plan: Nuevas funcionalidades avanzadas

## Ya implementado (referencia)
Autenticación, Dashboard con métricas ARS/USD, filtros avanzados, editor de 13 pasos, plantillas personalizables, CRM clientes, perfil agencia, proveedores, pagos, recordatorios, historial de versiones, exportar Excel, compartir PDF con vencimiento, importar URL, parsear PNR, generar itinerario con IA, tutoriales.

---

## Nuevas funcionalidades propuestas

### Prioridad Alta

#### 1. Firma digital del cliente
El cliente puede aprobar el presupuesto desde el link publico con un boton "Aprobar presupuesto". Se registra fecha, IP y nombre. El estado cambia automaticamente a "Aprobado" y el agente recibe notificacion visual en el dashboard.
- Seccion de aprobacion en `PublicPDF.tsx` con campo nombre y boton
- Edge function `approve-quote` (sin JWT, acceso publico)
- Badge "Aprobado por el cliente" en QuoteCard

#### 2. Duplicar plantilla
Boton rapido en la lista de plantillas para clonar una existente con nombre "Copia de [nombre]".
- Boton en `Templates.tsx` junto a editar/eliminar
- Reutilizar `addTemplate` con datos clonados

#### 3. Notas internas por presupuesto
Campo de texto libre visible solo para el agente (no aparece en el PDF). Para anotar "el cliente prefiere ventanilla", "confirmar hotel antes del 15", etc.
- Ya existe `internalNotes` en el tipo Quote pero no tiene UI
- Agregar campo en el wizard (paso General o como panel lateral)
- Guardar en la columna quotes (agregar al schema si falta)

#### 4. Dashboard de rentabilidad avanzado
Nuevos graficos: top 5 clientes por facturacion, rentabilidad por destino (barras), evolucion de ingresos vs costos (linea doble), distribucion de estados (pie).
- Expandir `DashboardCharts.tsx` con 4 graficos nuevos
- Cruzar datos de quotes + payments

### Prioridad Media

#### 5. Calendario de viajes
Vista mensual con grid CSS que muestre los viajes activos como barras de color. Click para ir al presupuesto.
- Nueva pagina `/calendar` con navegacion mes anterior/siguiente
- Sin dependencias externas, CSS grid puro
- Agregar link en Header

#### 6. Plantillas prediseñadas importables
4 plantillas profesionales listas para usar: Elegante (oscura), Moderna (colores vivos), Minimalista (blanco), Tropical (tonos calidos).
- Boton "Galeria de plantillas" en Templates
- Dialog con preview de cada una y boton "Importar"
- Datos hardcodeados en un archivo de constantes

#### 7. Selector de proveedor en servicios
Dropdown en cada seccion del wizard (vuelos, hoteles, transfers, actividades) para asociar un proveedor de la base de datos.
- Componente `SupplierSelect` reutilizable
- Integrar en FlightsStep, LodgingStep, TransportStep, ActivitiesStep
- El proveedor se guarda en cada item del presupuesto

#### 8. Exportar contactos de clientes
Boton en `/clients` para descargar la lista de clientes como CSV o Excel.
- Reutilizar libreria `xlsx` ya instalada
- Boton "Exportar clientes" en Clients.tsx

### Prioridad Baja

#### 9. Modo oscuro
Toggle en el header para cambiar entre tema claro y oscuro. Persistir preferencia en localStorage.
- Agregar clase `dark` en `<html>` y usar variantes Tailwind `dark:`
- Toggle en Header con icono sol/luna
- Hook `useTheme` para gestionar estado

#### 10. Estadisticas en link publico
Trackear cuantas veces el cliente abrio el link publico. Mostrar "Visto X veces" en el QuoteCard.
- Nueva tabla `quote_views` (quote_id, viewed_at, ip)
- Registrar vista en PublicPDF al cargar
- Mostrar contador en el dashboard

---

## Resumen

| # | Funcionalidad | Complejidad | Impacto |
|---|--------------|-------------|---------|
| 1 | Firma digital cliente | Media | Alto |
| 2 | Duplicar plantilla | Baja | Medio |
| 3 | Notas internas | Baja | Alto |
| 4 | Dashboard rentabilidad | Media | Alto |
| 5 | Calendario de viajes | Media | Medio |
| 6 | Plantillas prediseñadas | Baja | Medio |
| 7 | Selector proveedor en servicios | Baja | Alto |
| 8 | Exportar clientes | Baja | Bajo |
| 9 | Modo oscuro | Media | Bajo |
| 10 | Estadisticas link publico | Media | Alto |

## Recomendacion de orden
Arrancar con las rapidas de alto impacto (2, 3, 7), luego las de impacto alto (1, 4, 10), y despues las de medio impacto (5, 6).

¿Cuales te gustaria implementar?

