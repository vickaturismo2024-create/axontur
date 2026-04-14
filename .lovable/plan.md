

# Plan: Navegacion cruzada + fichas expandibles de clientes

## Resumen

Agregar links de navegacion cruzada entre presupuestos, clientes y expedientes, y convertir las tarjetas de clientes en fichas expandibles con toda la informacion del cliente, presupuestos y expedientes asociados.

## Cambios

### 1. `src/components/quotes/QuoteCard.tsx` — Links a cliente y expediente

- Buscar si existe un expediente asociado al quote (query a `files` donde `quote_id = quote.id`) usando un `useEffect` al montar
- Mostrar link "Ver cliente" al lado del nombre del cliente (navegar a `/clients?highlight=clientName`)
- Si existe expediente, mostrar boton "Ver expediente" que navega a `/files/{fileId}` (reemplazar el boton "Expediente" actual que crea uno nuevo, mostrando "Ver expediente" si ya existe o "Crear expediente" si no)

### 2. `src/pages/FileDetail.tsx` — Links a cliente y presupuesto

- En el header, hacer que `client_name` sea un link clickeable que navegue a `/clients?highlight=clientName`
- Si `file.quote_id` existe, agregar boton/link "Ver presupuesto" que navegue a `/quote/{quote_id}`

### 3. `src/pages/Clients.tsx` — Fichas expandibles con datos completos

Reemplazar el grid de Cards por tarjetas expandibles (usando Collapsible):

**Vista colapsada** (lo que se ve ahora resumido): nombre, DNI, email, telefono, badges de documentos

**Vista expandida** (al clickear la tarjeta):
- **Datos personales**: todos los campos (direccion, localidad, nacionalidad, fecha nacimiento, sexo, CUIL/CUIT, pasaporte con emisión y vencimiento, DNI con vencimiento)
- **Presupuestos asociados**: lista de quotes vinculados con destino, fecha, estado, precio — cada uno clickeable para navegar a `/quote/{id}`
- **Expedientes asociados**: query a `files` por `client_name` o `client_id`, mostrar lista con file_number, destino, estado (badge de color), fecha — cada uno clickeable para navegar a `/files/{id}`
- Botones Editar y Eliminar se mantienen

Para obtener expedientes del cliente: hacer una query a `files` filtrando por `client_name` o `client_id` cuando se expande la tarjeta (lazy load).

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/quotes/QuoteCard.tsx` | Detectar expediente existente, link a cliente, link a expediente |
| `src/pages/FileDetail.tsx` | Link a cliente y a presupuesto en header |
| `src/pages/Clients.tsx` | Fichas expandibles con todos los datos, presupuestos y expedientes |

No requiere cambios de BD.

