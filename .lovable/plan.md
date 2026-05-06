# Fix: Invitation email returns "Edge Function returned a non-2xx status code"

## Diagnosis

Logs of `send-team-invitation` show:
```
UNAUTHORIZED_INVALID_JWT_FORMAT
status: 401
url: .../functions/v1/send-transactional-email
```

When `send-team-invitation` calls `supabase.functions.invoke('send-transactional-email', ...)` using the service-role client, the SDK does NOT automatically inject the service-role key into the `Authorization` header of the inter-function HTTP call. Because `send-transactional-email` is configured with `verify_jwt = true`, the gateway rejects the call before it reaches our code.

## Fix

Two options, both safe:

### Option A (recommended) — Pass Authorization header explicitly

In `supabase/functions/send-team-invitation/index.ts`, change the `functions.invoke` call to include the service-role key in the headers:

```ts
const { data: sendData, error: sendErr } = await admin.functions.invoke(
  'send-transactional-email',
  {
    headers: { Authorization: `Bearer ${serviceKey}` },
    body: { /* same as today */ },
  },
);
```

This is the standard pattern for service-to-service Edge Function calls and keeps `verify_jwt = true` on `send-transactional-email` (good security default).

### Option B — Forward the caller's JWT

Pass the user's `authHeader` instead. Works because the user is authenticated, but couples the inter-function call to the user's session and breaks any future server-to-server trigger.

→ Going with **Option A**.

## Steps

1. Edit `supabase/functions/send-team-invitation/index.ts` to add the `Authorization: Bearer ${serviceKey}` header on the `functions.invoke` call.
2. Redeploy `send-team-invitation`.
3. User retries the invitation from Settings → Team.

## Out of scope

- No DB migrations.
- No changes to `send-transactional-email`, templates, or queue.
- No changes to `config.toml`.
