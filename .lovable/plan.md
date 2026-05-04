## Objetivo

Empaquetar **todo el código** de AxonTur + un dossier técnico (README de contexto, schema DB, análisis de stack y recomendaciones) en un único `.zip` descargable desde `/mnt/documents/`. Esto es una **tarea de exec** (no toca el código de la app), genera artefactos para que vos / un revisor externo puedan auditar todo offline.

## Qué incluye el paquete

```
axontur-review-bundle.zip
├── README.md                       ← contexto técnico completo (ver abajo)
├── ARCHITECTURE.md                 ← diagrama de capas, flujo de datos, multi-tenancy
├── STACK_ANALYSIS.md               ← análisis crítico de tecnologías + recomendaciones
├── DATABASE_SCHEMA.md              ← todas las tablas, RLS, funciones, triggers
├── EDGE_FUNCTIONS.md               ← inventario de las 12 edge functions
├── METRICS.md                      ← LOC por módulo, dependencias, archivos pesados
├── code/
│   ├── src/                        ← 100% del frontend (~42k LOC, 280 archivos)
│   ├── supabase/
│   │   ├── functions/              ← 12 edge functions (Deno)
│   │   ├── migrations/             ← 43 migraciones SQL
│   │   └── config.toml
│   ├── package.json
│   ├── tsconfig*.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── index.html
└── db-snapshot/
    ├── tables.sql                  ← DDL exportado de las 30+ tablas
    ├── functions.sql               ← 23 funciones DB (has_role, current_agency_id, triggers, etc.)
    └── rls-policies.sql            ← todas las policies RLS
```

> Se excluyen `node_modules`, `bun.lockb`, `.env` (secretos) y archivos generados.

## Contenido del README.md de contexto

1. **Qué es AxonTur** — ERP/Back Office para agencias de viajes (multi-tenant).
2. **Stack actual** resumido:
   - **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + shadcn/ui (Radix) + React Query 5 + React Router 6 + React Hook Form + Zod
   - **Backend:** Supabase (Postgres + Auth + Edge Functions Deno + pgmq para colas de email)
   - **Hosting:** Lovable (preview) + `axontur.lovable.app` (publicado). Supabase gestionado.
   - **PDF:** html2canvas + jsPDF | **Excel:** xlsx (SheetJS) | **AI:** Lovable AI Gateway (Gemini/GPT-5)
3. **Módulos funcionales** (23 páginas): Dashboard, Quotes/Wizard, Files (Expedientes), Clients (CRM), Suppliers, Accounts (CC), Reports, Calendar, Reservations (PNR), Templates, Settings, Auth.
4. **Cómo correrlo localmente** (`bun install && bun dev`, vars de entorno requeridas).
5. **Convenciones del repo** (memoria de proyecto, RLS por `agency_id`, `parseISO` para fechas, `.upsert()` para quotes, `.range()` paginado >1000, etc.).

## Contenido de STACK_ANALYSIS.md (análisis crítico)

Evaluación honesta por capa, con **¿es la tecnología adecuada?** + alternativas:

- **Vite + React + TS** — Adecuado. SPA pura, sin SSR. Trade-off: SEO limitado (no es necesario para back-office).
- **shadcn/ui + Radix** — Adecuado. Bundle controlado vs MUI/Chakra.
- **React Query** — Bien usado (`refetchOnWindowFocus: false`, staleTime 5min). Revisar invalidaciones.
- **Supabase + RLS por `current_agency_id()`** — Patrón sólido para multi-tenant. Riesgos: cada query depende de la función SECURITY DEFINER; rendimiento con muchos miembros.
- **Edge Functions (Deno)** — 12 funciones, varias con `verify_jwt = false` (públicas) — auditar `scrape-package`, `get-public-quote`, `auth-email-hook`.
- **PDF con html2canvas + jsPDF** — Funciona pero es **costoso en cliente** (CPU/memoria, fuentes, paginación frágil). Alternativas: `@react-pdf/renderer`, Puppeteer en edge, o servicio externo.
- **Excel con xlsx (SheetJS)** — OK pero la versión community tiene CVEs históricos. Considerar `exceljs`.
- **pgmq + edge cron** para emails — Buena elección para evitar bloquear UI.
- **Bundle size** — 280 archivos, 42k LOC frontend; revisar code-splitting por ruta (hoy `App.tsx` importa todas las páginas estáticamente).
- **Hosting** — Lovable publish es estático/CDN. Supabase es el cuello de botella real (instance size). Recomendación: monitorear `cloud_status` y considerar región.
- **Seguridad** — RLS bien aplicado, pero usar `supabase--linter` y revisar policies con `current_agency_id()` que asume 1 user = 1 agencia.
- **Testing** — Solo 1 archivo de test (`src/test/example.test.ts`). **Gap importante** — recomendar Vitest + Testing Library para hooks críticos (pricing, occupancy, fileFromQuote).
- **Observabilidad** — No hay Sentry/PostHog. Solo console + edge logs.

Cada punto incluye: **veredicto** (Mantener / Revisar / Migrar), **razón**, y **alternativa concreta** si aplica.

## Contenido de DATABASE_SCHEMA.md

- Listado de las **~30 tablas** agrupadas por dominio (agencies, quotes, files, reservations, accounts, email).
- Para cada tabla: columnas, RLS policies, FKs.
- Las **23 funciones** SQL agrupadas: helpers (`has_role`, `current_agency_id`), triggers (`sync_*_to_account_movement`, `set_file_number`), RPCs (`accept_agency_invitation`, `get_invitation_by_token`).
- Diagrama ASCII de relaciones principales (quote → file → services/receipts/payments → account_movements).

## Pasos de ejecución

1. Crear directorio `/tmp/bundle/` con la estructura.
2. Copiar `src/`, `supabase/functions/`, `supabase/migrations/`, configs.
3. Generar los `.md` de documentación (escritos por mí leyendo el repo + memoria + schema ya en contexto).
4. Volcar schema DB usando `supabase--read_query` sobre `information_schema` y `pg_proc` para tener un snapshot SQL fiel.
5. Empaquetar con `zip -r` (vía `nix run nixpkgs#zip`).
6. Emitir `<lov-artifact path="axontur-review-bundle.zip" mime_type="application/zip">`.

## Tamaño estimado del ZIP

~1.2 MB comprimido (código fuente sin `node_modules`).

## Lo que NO incluye (y por qué)

- **`.env` / secretos** — riesgo de exposición. Listo los nombres en el README.
- **`node_modules` / lockfiles binarios** — reproducibles con `bun install`.
- **Datos reales de la DB** — solo schema, no filas.
- **Build artifacts** (`dist/`).

## Confirmación

¿Procedo con esta estructura, o querés que ajuste algo (ej. incluir lockfile, sumar análisis de performance específico, generar también un PDF en vez de solo `.md`)?
