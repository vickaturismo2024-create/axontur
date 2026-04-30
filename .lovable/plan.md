# Re-provisionar el dominio de email

## Contexto

- Dominio: `notify.vickaturismo.tur.ar`
- Estado actual: **Pending** (sin cambios hace varios días)
- DNS: 100% propagado globalmente (`ns5.lovable.cloud`, `ns6.lovable.cloud` confirmados en DNSChecker)
- Diagnóstico: el verificador del lado Lovable quedó atascado y no re-chequea automáticamente

La infraestructura de cola, tablas y Edge Functions ya está desplegada y operativa — solo falta que el dominio quede en estado **Active** para que empiecen a salir los emails.

## Importante: esta acción la tenés que hacer vos en la UI

Yo **no tengo herramienta para eliminar el dominio** desde acá. La eliminación y re-creación se hacen manualmente en **Cloud → Emails → Manage Domains**. Lo que sí puedo hacer es guiarte paso a paso y verificar el estado después.

## Pasos

### 1. Eliminar el dominio actual (lo hacés vos)

1. Abrí **Cloud → Emails → Manage Domains**
2. Encontrá la fila de `notify.vickaturismo.tur.ar`
3. Click en los **tres puntos (⋯)** a la derecha
4. Seleccioná **Remove** (Eliminar) y confirmá

### 2. Re-agregarlo desde cero (lo hacés vos)

1. En la misma pantalla, click en **Add Domain** (o equivalente)
2. Ingresá `vickaturismo.tur.ar` como dominio raíz
3. Dejá `notify` como subdominio (es el default y coincide con la config actual del código)
4. Confirmá

Como los registros NS (`ns5.lovable.cloud`, `ns6.lovable.cloud`) **ya están propagados** en tu proveedor de DNS, la verificación debería ser **inmediata** o tomar pocos minutos — no hay que esperar 72hs porque el DNS ya existe.

### 3. Yo verifico el resultado

Una vez que lo re-agregaste, decime "listo" y voy a:
- Llamar a `check_email_domain_status` para confirmar que pasó a **Active**
- Revisar la cola de emails y el log de envíos
- Si queda algún email en "pending" desde antes, forzar el procesamiento de la cola

## Qué NO hay que tocar

- **No cambies los registros NS** en tu proveedor de dominio. Quedan igual (`ns5` y `ns6`). Cuando re-agregues el dominio, Lovable detectará que ya están y verificará al instante.
- **No cambies el subdominio** (tiene que seguir siendo `notify`) porque el código en `auth-email-hook` y `send-transactional-email` tiene hardcodeado `notify.vickaturismo.tur.ar` como `SENDER_DOMAIN`. Si cambia el subdominio, hay que actualizar el código también.

## Plan B (si después de re-agregar sigue en Pending >10 min)

Si el problema persiste incluso después de re-crear el dominio, el bug es del verificador de Lovable y hay que escalarlo a soporte con:
- Nombre del dominio
- Captura del DNSChecker mostrando NS propagados
- Captura del estado "Pending" en Manage Domains

Mientras tanto, AxonTur sigue 100% operativo — la única funcionalidad afectada es el envío automático de emails (invitaciones de equipo, notificaciones). Las invitaciones se pueden seguir compartiendo manualmente desde **Configuración → Equipo**.

## Resumen de acciones

| Paso | Quién | Dónde |
|------|-------|-------|
| Eliminar dominio | Vos | Cloud → Emails → ⋯ → Remove |
| Re-agregar dominio | Vos | Cloud → Emails → Add Domain |
| Verificar estado | Yo | Tras tu confirmación |
| Revisar cola de emails | Yo | Tras verificar Active |
