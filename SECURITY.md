# Security notes

## Browser credentials

Everything prefixed with `VITE_` is public and can be read from the built app.
Only the Supabase project URL and publishable/legacy anon key may be exposed
there. Application-owned provider tokens, Supabase secret/service-role keys,
passwords, and private keys belong in server-side Supabase Edge Function
secrets.

The optional OpenRouter and Azure settings are bring-your-own-key features:
each learner's personal key stays in that learner's IndexedDB and is never
compiled into or shared by the app. Never put an app-wide/shared provider key
in those fields; a public multi-user deployment should proxy shared provider
credentials through an authenticated Edge Function.

`node scripts/check-client-secrets.mjs` scans both source and the production
bundle for common private credential formats. The GitHub Pages deployment runs
this check after every build.

## Supabase access

All user-data tables use row-level security policies scoped to
`auth.uid() = user_id`. Anonymous roles have no table privileges. Authenticated
roles receive only the operations required by cloud sync.

Server-only usage and generation-log tables intentionally have RLS enabled,
no browser grants, and no browser policies. Their privileged functions are
executable only by `service_role`.

## Edge Function origins

Browser calls are accepted from `https://zumboggo.github.io` and local
development origins. Additional deployment origins must be added to the
comma-separated `CHUNKY_ALLOWED_ORIGINS` Edge Function secret.

Origin checks supplement authentication; they do not replace JWT validation or
row-level authorization.
