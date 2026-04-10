

# Plan: Paquete de mejoras — Duplicar, Tags, Búsqueda global, Notificaciones

Implementación en orden de complejidad creciente.

---

## 1. Duplicar presupuesto para otro cliente

### Cambios
- **`src/pages/Dashboard.tsx`**: Agregar opción "Duplicar para otro cliente" en el menú de acciones de cada QuoteCard. Abre un dialog para seleccionar el nuevo cliente.
- **`src/components/quotes/DuplicateForClientDialog.tsx`** (nuevo): Dialog con selector de cliente existente. Al confirmar, llama a `duplicateQuote` y actualiza los datos del cliente en el quote duplicado.
- La función `duplicateQuote` ya existe en QuotesContext — solo necesitamos post-procesar el resultado para cambiar el cliente.

---

## 2. Etiquetas/Tags en presupuestos

### Base de datos
- Crear tabla `quote_tags` con columnas: `id`, `user_id`, `name`, `color`, `created_at`
- Crear tabla `quote_tag_assignments` con columnas: `id`, `quote_id`, `tag_id`
- RLS: usuario solo ve/gestiona sus propios tags

### Cambios en código
- **`src/types/quote.ts`**: No requiere cambios (los tags se manejan aparte)
- **`src/components/quotes/TagManager.tsx`** (nuevo): Componente para crear, editar y eliminar tags con selector de color
- **`src/components/quotes/QuoteCard.tsx`**: Mostrar badges de tags asignados en cada card
- **`src/pages/Dashboard.tsx`**: Agregar filtro por tags en los filtros existentes
- **`src/components/quotes/TagSelect.tsx`** (nuevo): Popover para asignar/desasignar tags a un quote

---

## 3. Búsqueda global

### Cambios
- **`src/components/layout/GlobalSearch.tsx`** (nuevo): Componente Command (CMD+K) que busca en:
  - Presupuestos (por destino, cliente)
  - Clientes (por nombre, email, teléfono)
  - Proveedores (por nombre)
- Usa datos del contexto de quotes + fetch de clientes y proveedores
- Resultados agrupados por categoría con navegación directa al hacer click
- **`src/components/layout/Header.tsx`**: Agregar botón de búsqueda que abre el GlobalSearch + atajo CMD+K

---

## 4. Notificaciones por email

### Prerequisitos
- Configurar dominio de email (se mostrará el dialog de setup)
- Configurar infraestructura de email

### Notificaciones a implementar
- **Presupuesto aprobado**: Cuando un cliente aprueba un presupuesto desde el enlace público, enviar email al agente notificando la aprobación
- **Documento por vencer**: Alerta cuando un DNI/pasaporte de cliente está a 30 días de vencer

### Cambios
- **Edge function `approve-quote`**: Agregar llamada a `send-transactional-email` después de la aprobación, enviando al email del agente (del perfil)
- **Edge function `check-document-expiry`** (nuevo): Cron job que revisa documentos por vencer y envía emails
- **Templates de email**: Templates React Email para cada tipo de notificación

---

## Archivos

| Archivo | Acción |
|---|---|
| `src/components/quotes/DuplicateForClientDialog.tsx` | **Nuevo** |
| `src/components/quotes/TagManager.tsx` | **Nuevo** |
| `src/components/quotes/TagSelect.tsx` | **Nuevo** |
| `src/components/layout/GlobalSearch.tsx` | **Nuevo** |
| `src/pages/Dashboard.tsx` | Duplicar + tags + filtros |
| `src/components/quotes/QuoteCard.tsx` | Tags + duplicar |
| `src/components/layout/Header.tsx` | Búsqueda global |
| Migración DB | Tablas `quote_tags`, `quote_tag_assignments` |
| Edge functions | Notificaciones email |
| Templates email | Aprobación + documentos |

## Orden de implementación
1. Duplicar presupuesto (rápido, sin DB)
2. Tags (requiere migración DB)
3. Búsqueda global (solo frontend)
4. Notificaciones por email (requiere setup de dominio)

