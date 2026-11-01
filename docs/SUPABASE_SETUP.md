# Account storage setup

Eventora's browser demo works without an account. Private accounts use Supabase Auth, owner-scoped event records and explicit Save to account actions. Browser drafts are imported only when requested.

## Frontend configuration

The application retains the existing Eventora development-project public URL/publishable key in src/lib/cloud/public-project.ts. These are public client configuration, protected by RLS, not administrative credentials. To use another project, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. VITE_SUPABASE_ANON_KEY is a legacy fallback. Set VITE_DEMO_ONLY=true to disable accounts. See .env.example.

Never expose a database password, secret key, service-role key or provider key in VITE_* variables.

## Database and Auth

Apply all three versioned SQL migrations under supabase/migrations in order. They create private events, proposal runs and boolean allocation-lock validation. Keep ownership RLS and explicit API grants enabled.

The save_event RPC uses the caller's identity and expected revision. Account changes remain local until explicitly saved. Concurrent-save conflicts retain local work and require review/reload rather than overwriting another revision. Sign-out clears private workspace state and restores local demo data.

Configure email/password authentication, confirmation emails and redirect URLs for the final host. Review password protection settings: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Planner

Follow AI_SETUP.md to deploy the authenticated planner function and configure Gemini secrets server-side. Migrating this repository does not move the existing Supabase project or its secrets.

## Verification

Automated Postgres tests use PGlite with synthetic identities to check ownership isolation, grants, nested record validation and revision conflicts. Before release, verify signup/confirmation, sign-in, explicit save, full reload, error recovery and sign-out on the final host using synthetic data. Do not commit account credentials, event records or private screenshots.
