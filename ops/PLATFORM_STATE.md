# DRIGHT Platform State Snapshot

Generated: 2026-08-18

## GitHub
- Repository: `mavemarvy/DRIGHT`
- Default branch: `main`
- Latest inspected application commit: `58d70932ec5d20df4861ecee7610ec9f66bcc8df`
- Commit message: `feat: establish DRIGHT authentication and identity foundation`

## Vercel
- Project: `dright`
- Project ID: `prj_FF88IPd8rS6g7kyexDRTK6JmFwEa`
- Framework: Next.js
- Node.js: 24.x
- Latest production deployment: `dpl_xwZuQ9jHkjRLF6Y7vGVBYDkoLSCi`
- Latest production deployment state: READY
- Latest deployment URL: `dright-k04zwwn09-mvy00342-4254s-projects.vercel.app`
- Current project live flag: false
- Vercel is GitHub-connected to `mavemarvy/DRIGHT` on `main`.
- Several older deployments for the same authentication commit are ERROR; the newest deployment is READY.

## Supabase
- Project: `DRIGHT`
- Project ref: `atnvdzwpvoiergxdkofr`
- Region: `eu-west-1`
- Status: ACTIVE_HEALTHY
- PostgreSQL: 17.6.1.155
- Live schema: 90 public tables, 27 functions, 169 RLS policies, 2 triggers
- Applied remote migrations: 17

## Synchronization finding
The three systems are connected but are NOT yet source-identical.

The GitHub repository currently contains only one migration file under `supabase/migrations/`, while the live Supabase project reports 17 applied migrations and 90 public tables. Therefore the live database contains substantially more schema history than is represented by the current Git repository migration directory.

The Vercel project is connected to GitHub and its newest production deployment was built from GitHub commit `58d70932ec5d20df4861ecee7610ec9f66bcc8df`.

## Safe synchronization policy
- Do not reset or overwrite the production Supabase database merely to make migration history look equal.
- Treat the live Supabase schema as the current database source of truth until a full migration baseline has been reconstructed and reviewed.
- Treat GitHub `main` as the application source of truth.
- Use `supabase/REMOTE_SCHEMA_MANIFEST.json` as a fingerprint of the live database state.
- Future schema changes should be committed as ordered Supabase migrations and then deployed through the normal migration workflow.

## Security observations
Supabase security advisors currently report:
- RLS-enabled tables with no policies: `affiliate_attributions`, `affiliate_clicks`, and `role_permissions`.
- Multiple SECURITY DEFINER functions are executable by `anon` and/or `authenticated` roles and should be reviewed for least-privilege execution.
- Several functions have mutable search paths according to the advisor.

These are recorded observations only; no production security policy was changed automatically by this synchronization snapshot.
