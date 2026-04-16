

## Plan: Pestaña de Configuración unificada (`/settings`)

### Estructura
Una sola página `/settings` con 4 sub-pestañas (shadcn `Tabs`). El item del menú principal pasa a llamarse **"Configuración"** y absorbe a "Mi Agencia" como sub-pestaña.

```text
/settings
 ├── Cuenta          (email, cambiar contraseña, cerrar sesión global)
 ├── Agencia         (datos actuales de /agency, sin cambios funcionales)
 ├── Preferencias    (tema, moneda por defecto, formato de fecha, idioma)
 └── Notificaciones  (toggles + días de anticipación)
 └── Documentos      (numeración + textos legales)
```
Total: 5 sub-pestañas (sumé Documentos porque elegiste "Numeración y formato de documentos" en el alcance).

### Cambios de base de datos
Migración para extender `profiles` con columnas opcionales (todas con default sensato → cero impacto en datos existentes):

| Columna | Tipo | Default | Para qué |
|---|---|---|---|
| `default_currency` | text | `'USD'` | Moneda por defecto de presupuestos/expedientes nuevos |
| `date_format` | text | `'dd/MM/yyyy'` | Formato visual en toda la app |
| `theme` | text | `'system'` | Sincroniza tema entre dispositivos |
| `notify_birthdays` | boolean | `true` | Toggle alerta de cumpleaños |
| `notify_document_expiry` | boolean | `true` | Toggle alerta DNI/Pasaporte |
| `notify_payment_due` | boolean | `true` | Toggle vencimiento de pagos a operadores |
| `payment_due_days` | integer | `3` | Días de anticipación para alerta de pagos |
| `document_expiry_months` | integer | `6` | Meses de anticipación para alerta de docs |
| `file_prefix` | text | `'FILE'` | Reemplaza el `FILE-001` hardcodeado |
| `receipt_prefix` | text | `'REC'` | Reemplaza el `REC-0001` hardcodeado |
| `pdf_footer_legal` | text | `''` | Texto legal opcional al pie de PDFs |

No toco `auth.users`, ni triggers de numeración existentes (`set_file_number`, `set_receipt_number` siguen igual: solo cambia el prefijo de visualización).

### Cambios de código

**Nuevos**
- `src/pages/Settings.tsx` — contenedor con `Tabs` y las 5 secciones.
- `src/components/settings/AccountTab.tsx` — email (readonly), cambio de contraseña vía `supabase.auth.updateUser({ password })`, botón "Cerrar sesión en todos los dispositivos" (`signOut({ scope: 'global' })`).
- `src/components/settings/PreferencesTab.tsx` — tema (claro/oscuro/sistema), moneda, formato de fecha.
- `src/components/settings/NotificationsTab.tsx` — switches + inputs numéricos.
- `src/components/settings/DocumentsTab.tsx` — prefijos y texto legal.
- `src/contexts/SettingsContext.tsx` — provider que lee `profiles` una vez y expone settings + `updateSettings()`. Cachea con react-query.

**Editados**
- `src/App.tsx` — registrar ruta `/settings` (protegida) y envolver con `SettingsProvider`. Mantengo `/agency` como redirect a `/settings?tab=agency` por compatibilidad.
- `src/components/layout/Header.tsx` — reemplazar item "Mi Agencia" por "Configuración" → `/settings`.
- `src/pages/Agency.tsx` — refactor: el form pasa a ser el componente `AgencyTab`, importado por `Settings.tsx`. La página queda como wrapper redirigiendo.
- `src/hooks/useTheme.ts` — leer/escribir el tema desde el context si hay sesión, fallback a localStorage.
- `src/components/notifications/BirthdayNotifier.tsx` y panel de recordatorios — respetar los toggles y días configurados.
- `src/pages/Files.tsx`, `FileDetail.tsx`, `FileReceiptsTab.tsx`, `receiptPdfUtils.ts` — leer prefijos del context en lugar de strings hardcodeados.

### Fuera de alcance (lo aclaro para no asumir)
- Cambio de email del usuario: lo dejo deshabilitado con tooltip "Próximamente" (requiere flujo de verificación de email; lo agregamos si lo pedís).
- Eliminación de cuenta: no lo incluyo salvo que lo pidas explícitamente.
- Idioma: solo dejo el control visible pero por ahora es solo español (preparado para futuro i18n).

### Primer paso al aprobar
Crear migración `ALTER TABLE profiles ADD COLUMN ...` con todas las columnas nuevas y sus defaults.

