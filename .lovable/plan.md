

# Plan: Navegación directa al cliente + filtros por estado en ficha expandible

## Problemas detectados

1. **FileDetail → Cliente**: Navega a `/clients?highlight=clientName` pero `Clients.tsx` no usa ese parámetro para auto-expandir la tarjeta del cliente correspondiente.
2. **Ficha de cliente**: Muestra presupuestos y expedientes en una lista plana sin filtros por estado.

## Cambios

### 1. `src/pages/Clients.tsx` — Auto-expandir cliente desde highlight param

- Leer `searchParams.get('highlight')` y cuando coincide con el nombre de un cliente, setear esa tarjeta como `open` automáticamente + scroll into view con `useRef`.
- Pasar `defaultOpen` como prop a `ExpandableClientCard`.

### 2. `src/pages/Clients.tsx` — Tabs y filtros dentro de la ficha expandida

Reemplazar las secciones planas de presupuestos y expedientes por:

```text
┌─ Datos personales ─────────────────────────┐
│ ...campos...                                │
└─────────────────────────────────────────────┘

┌─ [Presupuestos] [Expedientes] ─── tabs ────┐
│                                             │
│  Tab Presupuestos:                          │
│  [Pendientes] [Enviados] [Aprobados] [Canc.]│
│  - lista filtrada de quotes                 │
│                                             │
│  Tab Expedientes:                           │
│  [Abiertos] [Cerrados]                      │
│  Abiertos = confirmed, in_progress          │
│  Cerrados = completed, cancelled            │
│  - lista filtrada de files                  │
└─────────────────────────────────────────────┘
```

- Usar `Tabs` + badges con conteo por categoría
- Abiertos: `confirmed`, `in_progress` (y `pending` si existiera)
- Cerrados: `completed`, `cancelled`
- Presupuestos: `draft` (Pendientes), `sent` (Enviados), `approved` (Aprobados), `cancelled`/`expired` (Cancelados)

### 3. `src/pages/FileDetail.tsx` — Navegación directa al cliente

- Si `file.client_id` existe, navegar a `/clients?highlight=clientName` (ya lo hace) — el fix real está en Clients.tsx para que lo reciba y auto-expanda.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Clients.tsx` | Auto-expand con highlight param, tabs presupuestos/expedientes con filtros por estado |

No requiere cambios de BD.

