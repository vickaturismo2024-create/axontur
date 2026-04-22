

## Verificación automática de infraestructura (Email + Dominio)

### Objetivo
Tener un **panel interno de salud** que valide en tiempo real si el dominio de email (`notify.vickaturismo.tur.ar`), el procesamiento de la cola de emails y la cuenta de envíos están operativos. Bloquea acciones críticas (envío de recibos/confirmaciones) cuando algo no está listo y muestra un estado claro al usuario.

### Funcionalidades

**1. Página `/settings/infraestructura` (nueva pestaña en Configuración)**
- Tarjeta **Dominio de Email** con estado visual:
  - 🟢 Verificado y activo
  - 🟡 DNS propagándose
  - 🔴 Falló / requiere acción
  - Muestra FQDN, fecha de alta y último chequeo.
- Tarjeta **Cola de envío**: cantidad de emails `pending`, `sent`, `failed`, `dlq` (últimas 24 hs).
- Tarjeta **Últimos envíos** (tabla): plantilla, destinatario, estado, timestamp, error si aplica. Deduplicada por `message_id`.
- Botón **Re-verificar ahora** que vuelve a consultar el estado del dominio.

**2. Hook global `useEmailInfraStatus`**
- Polling cada 5 minutos del estado del dominio + métricas de la cola.
- Cachea resultado en React Query para no spamear.
- Expone `{ domainReady, queueHealthy, lastCheck, error }`.

**3. Guardas en acciones críticas**
- En `FileReceiptsTab` (enviar recibo por email), `EditReservationModal` (confirmaciones) y demás puntos que invocan `emailService.ts`:
  - Si `domainReady === false` → modal advirtiendo "El dominio aún no está verificado, el email puede no llegar. ¿Enviar igual?".
  - Si `queueHealthy === false` (muchos `dlq`/`failed` recientes) → toast amarillo de advertencia.
- **No bloquea** generación de PDF (el PDF no depende del dominio); solo advierte en envíos por email.

**4. Indicador en Header**
- Punto de color discreto al lado del nombre de la agencia:
  - Verde = todo OK / Amarillo = propagando / Rojo = requiere acción.
- Click → lleva a `/settings/infraestructura`.

**5. Notificación inicial**
- Al loguearse, si el dominio pasa de `pending` a `active` desde la última visita, toast de éxito: "Tu dominio de email está activo".
- Si lleva más de 72 hs en `pending`, banner persistente con link a la guía de DNS.

### Detalles técnicos

- **Edge function nueva** `check-email-infra` (verify_jwt = true):
  - Consulta `email_send_log` agregada (últimas 24 hs) por `status` deduplicado por `message_id`.
  - Devuelve JSON `{ queue: { pending, sent, failed, dlq }, lastError }`.
- **Estado del dominio**: se consulta vía `supabase.functions.invoke('check-email-infra')` que internamente lee la tabla de configuración del workspace; no se expone API key alguna al cliente.
- **React Query**: `staleTime: 5min`, `refetchOnWindowFocus: false` (consistente con la convención del proyecto, ver memoria `tab-persistence-optimization`).
- **RLS**: solo el dueño del proyecto (rol `admin` en `user_roles` si existe, sino `auth.uid() = user_id`) puede ver el panel.

### Archivos a crear/modificar

```
crear:
  src/pages/InfraStatus.tsx           (panel principal)
  src/hooks/useEmailInfraStatus.ts    (hook con React Query)
  src/components/layout/InfraHealthDot.tsx  (indicador en Header)
  supabase/functions/check-email-infra/index.ts

modificar:
  src/components/layout/Header.tsx              (agregar punto de salud)
  src/pages/Settings.tsx                        (tab "Infraestructura")
  src/components/files/FileReceiptsTab.tsx      (guard antes de enviar)
  src/components/reservations/EditReservationModal.tsx  (guard)
  src/lib/emailService.ts                       (helper isInfraReady())
  src/App.tsx                                   (ruta /settings/infraestructura)
  supabase/config.toml                          (registrar nueva función)
```

### Verificación
- Pestaña **Infraestructura** muestra estado del dominio y métricas de la cola de las últimas 24 hs.
- Header muestra punto de color reflejando el estado real.
- Al intentar enviar un recibo por email con DNS pendiente, aparece modal de confirmación.
- Re-chequeo manual actualiza estado sin recargar página.
- Cuando el dominio pase a `active`, indicadores cambian a verde automáticamente en la próxima ventana de polling (≤5 min).

