

# Plan: Fichas de clientes expandidas con importación Excel y grupos

## Mapeo de columnas del Excel

| Columna Excel | Campo en BD |
|---|---|
| APELLIDO + NOMBRE | `name` (concatenar: "APELLIDO NOMBRE") |
| DIRECCIÓN | `address` (nuevo) |
| TEL_PAR | `phone` (existente) |
| TEL_COM | `phone_work` (nuevo) |
| CELULAR | `phone_mobile` (nuevo) |
| NACIONALIDAD | `nationality` (nuevo) |
| FECHA DE NACIMIENTO | `birth_date` (nuevo) |
| DNI | `dni` (nuevo) |
| VTO_DOC | `dni_expiry` (nuevo) |
| PASAPORTE | `passport` (nuevo) |
| EMISIÓN PASAPORTE | `passport_issue` (nuevo) |
| VENCIMIENTO PASAPORTE | `passport_expiry` (nuevo) |
| EMAIL | `email` (existente) |
| LOCALIDAD | `locality` (nuevo) |
| CUIL/CUIT | `cuil_cuit` (nuevo) |
| SEXO | `sex` (nuevo) |

Nota: valores como `01/01/00` en fechas de pasaporte/DNI se tratan como "sin dato" y se guardan vacíos.

## Cambios

### 1. Migración SQL
- Agregar columnas a `clients`: `address`, `phone_work`, `phone_mobile`, `nationality`, `birth_date` (date), `dni`, `dni_expiry` (date), `passport`, `passport_issue` (date), `passport_expiry` (date), `locality`, `cuil_cuit`, `sex`
- Crear tabla `client_groups` (id, user_id, name, created_at) con RLS
- Crear tabla `client_group_members` (id, group_id FK, client_id FK) con RLS basada en dueño del grupo

### 2. Actualizar `src/pages/Clients.tsx`
- Expandir formulario de creación/edición con secciones: Datos personales, Documentos, Contacto
- Agregar botón "Importar Excel" que: lee archivo .xlsx, muestra preview con cantidad de registros detectados, y al confirmar inserta masivamente
- Lógica de mapeo: concatenar APELLIDO+NOMBRE, parsear fechas (ignorar 01/01/00), limpiar teléfonos
- Sección de gestión de grupos: crear grupo, asignar/quitar clientes
- Tarjetas de cliente muestran DNI, teléfonos, grupo asignado
- Exportar clientes incluye todos los campos nuevos

### 3. Actualizar `src/components/quotes/ClientSelect.tsx`
- Agregar pestaña/sección "Grupos" para seleccionar un grupo completo
- Al seleccionar grupo, cargar primer miembro como cliente principal y mostrar cantidad de pasajeros

### 4. Actualizar `src/components/quotes/steps/GeneralStep.tsx`
- Integrar selección de grupo para cargar múltiples pasajeros

## Archivos a modificar/crear
1. **Migración SQL** — expandir `clients`, crear `client_groups` y `client_group_members`
2. `src/pages/Clients.tsx` — formulario expandido + importador Excel + grupos
3. `src/components/quotes/ClientSelect.tsx` — soporte de grupos
4. `src/components/quotes/steps/GeneralStep.tsx` — selección de grupo

