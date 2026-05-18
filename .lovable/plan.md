# Copia completa de la base de datos

Voy a generar un dump completo del schema `public` de tu Lovable Cloud (Supabase) usando `pg_dump` contra `SUPABASE_DB_URL`, que incluya **estructura + datos** listo para restaurar en otro proyecto Supabase.

## Qué se va a generar

Dos archivos en `/mnt/documents/`:

1. **`AxonTur_full.sql`** — dump completo (schema + datos) del schema `public`.
   - `CREATE TABLE`, índices, funciones, triggers, RLS, enums
   - `COPY ... FROM stdin` con todos los registros
2. **`AxonTur_data_only.sql`** — sólo datos (`--data-only`), útil si ya tenés el schema cargado en el destino y querés sólo migrar registros.

Comando base:
```bash
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner --no-privileges \
  --quote-all-identifiers \
  -f /mnt/documents/AxonTur_full.sql
```

## Cómo restaurar en el otro proyecto

```bash
psql "postgresql://postgres:[PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres" \
  -f AxonTur_full.sql
```

## Consideraciones importantes

- **Usuarios de auth (`auth.users`) NO se incluyen** — `pg_dump` sobre `public` no toca el schema `auth` de Supabase. Las tablas referencian `user_id` por convención (sin FK real), así que los datos se cargan, pero para que un usuario pueda iniciar sesión en el nuevo proyecto hay que recrearlo en Supabase Auth con el **mismo UUID** (o reasignar los `user_id` de las filas).
- **Storage buckets**: este proyecto no tiene buckets, así que no hay archivos que migrar.
- **Edge Functions y Secrets**: no se exportan con `pg_dump`; hay que recrearlos en el proyecto destino (el código de las functions ya está en tu repo `supabase/functions/`).
- **Extensiones** (`pgcrypto`, `pgmq`, etc.): el dump las incluye con `CREATE EXTENSION IF NOT EXISTS`, pero si alguna falla hay que habilitarla manualmente desde Database → Extensions.
- **Tamaño**: dependiendo de la cantidad de presupuestos / expedientes el archivo puede pesar varios MB. Te lo dejo descargable desde el panel de archivos.

¿Avanzo con esto tal cual, o querés que filtre alguna tabla (por ejemplo, excluir `email_*`, logs o `account_movements` que se regeneran solos vía triggers)?
