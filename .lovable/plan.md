

# Plan: Notificación pop-up de cumpleaños de clientes

## Resumen

Crear un componente que al cargar la app consulte los clientes cuya fecha de nacimiento coincida con el día actual (mismo día y mes) y muestre un toast de sonner por cada uno.

## Cambios

### 1. Nuevo componente `src/components/notifications/BirthdayNotifier.tsx`

- Componente sin UI visible (solo lógica)
- En un `useEffect` al montar (cuando hay `user`):
  - Fetch todos los clientes con `birth_date` no nulo (con paginación para superar el límite de 1000)
  - Filtrar en JS los que tengan mismo día y mes que `new Date()`
  - Por cada coincidencia, mostrar `toast('🎂 Hoy cumple años [nombre]!', { duration: 10000 })` con sonner
- Usar `sessionStorage` con key `birthday_notified_[fecha]` para no repetir los toasts si el usuario navega entre páginas
- Retorna `null`

### 2. `src/App.tsx` — Montar el notificador

- Importar `BirthdayNotifier` y renderizarlo dentro del `AuthProvider` / `BrowserRouter`, al lado del `TourOverlay`

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/notifications/BirthdayNotifier.tsx` | Nuevo componente |
| `src/App.tsx` | Montar `BirthdayNotifier` |

No requiere cambios de BD.

