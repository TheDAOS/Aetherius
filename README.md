# Aetherius

A Git-backed personal Markdown vault. React/TypeScript/Vite provides the PWA; Supabase Auth and Edge Functions mediate access to the user's private GitHub repository. GitHub remains the canonical source of note content.

The current implementation supports creating or connecting a private repository, selecting a branch, browsing/editing/deleting notes, atomic file moves, custom folders, templates, wikilinks, backlinks/graph indexing, raster image attachments, cached offline reads, and queued offline edits with explicit conflict resolution. Native iOS and AI/semantic search remain future work.

## Local development

Requirements: Node 24, pnpm 11.22.0, Deno 2, and Docker/Podman for local Supabase/PostgreSQL. The frontend/backend tests and browser fixtures run without paid keys or production services. Genuine GitHub OAuth and a real vault require a GitHub account and a separate development OAuth app.

1. `pnpm install --frozen-lockfile`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`. Copy `supabase/.env.example` to `supabase/.env.local` and set a **development** GitHub OAuth client ID/secret. Configure that OAuth application's callback to `http://localhost:54321/auth/v1/callback`.
3. Export the local GitHub OAuth variables into your shell, then run `pnpm exec supabase start`. The CLI reads provider environment variables from the shell; copying the example alone does not export them. Use `pnpm exec supabase status` to obtain the local API URL/public anon key and fill the web environment file. Never place a service-role key in any `VITE_` variable.
4. Apply migrations to the disposable/local database with `pnpm exec supabase db reset --local`. This resets local data. Do not substitute a hosted project URL.
5. Run `pnpm exec supabase functions serve api-v1 --env-file supabase/.env.local`. The Edge runtime supplies its server-side Supabase keys. Token bootstrap requires its service-role key; the PWA never receives it.
6. Run `pnpm --filter web dev`, open `http://localhost:5173`, sign in, and choose to create a private vault or connect one you can write. Existing repositories are not seeded or rewritten on connection.

A missing web configuration produces a setup message. OAuth redirect allowlists must include the actual app origin. Local config supports localhost and 127.0.0.1 on port 5173; configure the real deployment origin separately when releasing.

## Verification

```bash
pnpm test                    # React, service, IndexedDB, auth and parser regression tests
pnpm typecheck
pnpm lint
pnpm build
pnpm test:backend             # native Deno handler/GitHub-wrapper tests; no external network
pnpm test:e2e                 # real browser + SDK + actual handler, synthetic external stores
./scripts/test-migrations.sh  # disposable PostgreSQL migrations and role/isolation assertions
```

Browser tests use `/usr/bin/google-chrome` locally; override with `PLAYWRIGHT_CHROME_PATH`. In CI they use Playwright's Chromium installed with `pnpm exec playwright install --with-deps chromium`.

The migration script uses a cached Supabase PostgreSQL image locally. For another image, set `POSTGRES_TEST_IMAGE`, `POSTGRES_TEST_USER` and optionally `CONTAINER_RUNTIME` (see the script and CI job). It creates no host-port binding or persistent volume and removes its container on exit.

`pnpm --filter web test:coverage` reports coverage. CI runs frontend/backend tests, real browser workflows, migrations/role tests, typecheck, lint, build, and OpenAPI validation. Tests reduce regression risk; hosted OAuth configuration, production deployment and installed-device PWA behavior require release verification.

## Data and credentials

Notes remain ordinary Markdown in GitHub. IndexedDB is scoped per account; pending drafts survive sign-out. List refreshes reconcile deletions and overlay pending writes. Offline reads require previously downloaded content. Branch changes are blocked while mutations or editor drafts are pending.

Provider tokens pass through the OAuth callback once; bootstrap validates identity and stores them behind a backend-only table privilege boundary. They are stripped from persisted browser sessions. Browser code cannot read the token table. This requires applying the security migration and deploying the matching Edge Function together; local source changes do not change a hosted deployment.

Synchronization replays local operations and then verifies access to the selected remote tree. It does not fabricate a background server queue or silently overwrite divergent remote content. Vault assets are loaded through the authenticated API; supported uploads are PNG/JPEG/GIF/WebP/AVIF. Notes use `#note=<encoded-vault-path>` URLs.

See [architecture](docs/architecture/overview.md), [OpenAPI](openapi/openapi.yaml), and [repair verification](docs/audits/2026-11-11-repair-verification.md).
