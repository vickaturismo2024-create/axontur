

## Plan: Importar reservas de vuelosvicka → AxonTur

### Análisis del origen
El proyecto **Vicka Viajes Central** tiene un esquema casi idéntico al de AxonTur:

| vuelosvicka | AxonTur | Mapeo |
|---|---|---|
| `reservations` | `reservations` | Directo (locator, source_type, gds, notes, raw_text_latest) |
| `passengers` | `reservation_passengers` | Directo (last_name, first_name, title, document) |
| `flight_segments` | `flight_segments` | Directo (todos los campos coinciden) |
| `checkins` | `flight_checkins` | Directo |
| `attachments` | `reservation_attachments` | Directo (filename, file_url) |
| `changes` | `reservation_changes` | Directo |

Tablas de origen sin equivalente directo (las descarto): `imports`, `reminders` (esa última en AxonTur tiene otro propósito).

### Estrategia
Como ambos proyectos viven en proyectos Supabase distintos y AxonTur ya tiene Cloud, la migración se hace con un **script de migración one-shot** que ejecuto desde la sandbox:

1. Leo todas las reservas + relacionadas de la DB de origen (vía `psql` apuntando al proyecto vuelosvicka usando service role).
2. Inserto en AxonTur usando el `user_id` del usuario actual (vos), preservando relaciones por mapa de IDs viejo→nuevo.
3. Manejo upsert por **localizador** (si ya existe en AxonTur, actualizo segmentos/pasajeros).
4. Vinculo pasajeros con clientes existentes en `clients` por DNI/Pasaporte; si no existen, **creo cliente nuevo** en CRM.
5. Los `attachments.file_url` apuntan al bucket `attachments` del proyecto origen → los referencio tal cual (URLs públicas/firmadas si aplica). Si fueran privados habría que copiar archivos al storage de AxonTur (te lo confirmo en la ejecución cuando vea la URL real).

### Pasos de ejecución

1. **Pedirte el service-role key del proyecto vuelosvicka** (lo necesito para leer todas las filas — no alcanza con el anon key porque RLS las protege).
   - Lo guardo como secret `VUELOSVICKA_SERVICE_KEY` (no se commitea, no se expone al frontend).
   - También necesito tu `user_id` en vuelosvicka para filtrar solo TUS reservas (lo deduzco de la DB si solo hay un usuario).

2. **Script de migración** (`scripts/migrate-vuelosvicka.ts`, ejecutado vía `code--exec`, no queda en el código de la app):
   - Conecta a ambas DBs.
   - Pull de `reservations` → para cada una:
     - Upsert en AxonTur (`reservations`) por `(user_id, locator)`.
     - Reemplaza `reservation_passengers` (delete + insert) y mapea/crea `clients` por documento.
     - Reemplaza `flight_segments`, conservando seq.
     - Migra `flight_checkins` con el mapa segment_id viejo→nuevo y passenger_id viejo→nuevo.
     - Inserta `reservation_attachments` y `reservation_changes`.
   - Log final con conteo: X reservas, Y pasajeros, Z segmentos, W check-ins, V adjuntos, U cambios, N clientes nuevos creados.

3. **Verificación post-import**: query a las tablas de AxonTur y abrir la pantalla de Reservas para validar visualmente.

### Lo que NO se migra (y por qué)
- **Tabla `imports`**: AxonTur no la tiene. La info ya queda en `reservations.raw_text_latest`.
- **Tabla `reminders` de origen**: en AxonTur, `reminders` está vinculada a `quotes`, no a vuelos. Los recordatorios automáticos se generan dinámicamente desde fechas de vuelo.
- **Perfiles**: tu perfil de AxonTur ya existe, no se toca.

### Lo que necesito de vos para arrancar
1. Confirmar que querés que use **tu usuario actual de AxonTur** como dueño de TODAS las reservas importadas (asumo que sí porque sos vos quien importa).
2. **Service role key** del proyecto vuelosvicka — lo pedís en la configuración del backend de ese proyecto y me lo pasás cuando te lo solicite vía secret.

### Riesgos / consideraciones
- Si los `attachments` están en un bucket privado, sus URLs no funcionarán desde AxonTur. Lo detecto en la primera reserva con adjunto y te aviso si hace falta copiar archivos al storage propio (segundo paso opcional).
- La migración es **idempotente por localizador**: si la corrés dos veces, no duplica; sobrescribe (era lo que pediste).
- Reservas sin localizador en origen (raras) las identifico por `legacy_id = id_origen` para no duplicarlas en re-corridas.

