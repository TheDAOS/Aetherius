# Audit Fix Implementation Plan

> [!IMPORTANT]
> All architectural decisions have been resolved via `/grill-me` interview. This plan is ready to execute.

## Agreed Decisions

| Decision | Choice |
|----------|--------|
| GitHub Token | Store server-side, Edge Function reads from DB |
| OpenAPI Alignment | Align Edge Function TO the OpenAPI spec |
| Knowledge Graph/Sync | Keep (ADR-008 approved), fix performance bugs |
| Markdown Rendering | Replace with `markdown-it` library |
| CORS | `ALLOWED_ORIGINS` environment variable |
| Linting | Biome (single Rust-based tool) |
| GraphCanvas Fix | Fix bugs in current implementation |

---

## Work Streams (Parallel)

### Stream 1: Security — Server-Side Token Architecture
**Files:** `AuthContext.tsx`, `vault.ts`, `api-v1/index.ts`, `offlineDb.ts`, new migration, `openapi.yaml`

1. **New migration** `20260822_add_github_tokens.sql`:
   - Create `user_github_tokens` table (user_id FK, encrypted_token, scopes, expires_at)
   - Add RLS policies
   - Add trigger to store provider token on auth (or use Supabase auth hook)

2. **Edge Function** — remove `x-github-token` header dependency:
   - Read GitHub token from `user_github_tokens` table using the authenticated user's ID
   - Remove the `x-github-token` header check
   - Add token retrieval as part of the auth flow

3. **AuthContext.tsx** — stop exposing `providerToken`:
   - Remove `providerToken` from context
   - Store the token server-side during the OAuth callback
   - Use a Supabase Edge Function or webhook to capture `provider_token` from the session

4. **vault.ts** — remove `x-github-token` from all requests:
   - Remove `getHeaders()` method
   - Remove `providerToken` parameter from all methods
   - Rely on JWT-only authentication

5. **offlineDb.ts** — user-scoped namespacing:
   - Change DB_NAME to include user ID: `aetherius_vault_${userId}`
   - Add `clearAll()` call in `signOut()`

6. **CORS** — `api-v1/index.ts`:
   - Read `ALLOWED_ORIGINS` from `Deno.env.get()`
   - Set `Access-Control-Allow-Origin` to matched origin or reject
   - Remove `x-github-token` from `Access-Control-Allow-Headers`

7. **XSS Fix** — Replace NotePreview with markdown-it:
   - `pnpm add markdown-it` in `apps/web/`
   - Create safe renderer with `linkify: true` but sanitized href protocols

### Stream 2: API Contract Alignment
**Files:** `api-v1/index.ts`, `openapi.yaml`

1. Error responses → `{ code: '...', message: '...' }` format
2. `GET /v1/files` → use query parameter `path` instead of URL path extraction
3. `GET /v1/files/{path}` for directories → return `FileList` (update OpenAPI to document this behavior, since it makes sense)
4. `PUT /v1/files/{path}` → change `sha` to `expectedSha`
5. `DELETE /v1/files/{path}` → move `sha` from query param to request body `expectedSha`
6. Add input validation on `POST /v1/vault` (repository name format)
7. Add branch name sanitization (SSRF fix)

### Stream 3: Data Integrity Fixes
**Files:** `vault.ts`, `useVault.ts`, `github.ts`

1. **btoa/atob → TextEncoder/TextDecoder + base64**:
   - Replace all `btoa()` with UTF-8-safe `utf8ToBase64()` helper
   - Replace all `atob()` with `base64ToUtf8()` helper
   - Fix `github.ts` `initTemplateFiles` which also uses `btoa()`

2. **Dirty file guard** in `useVault.ts`:
   - `selectFile()` checks `isDirty` before setting `activeFilePath`
   - Show confirmation prompt if unsaved changes exist

3. **Dangling repo rollback** in `api-v1/index.ts`:
   - Wrap `POST /v1/vault` in try/catch with GitHub repo deletion on Supabase insert failure

### Stream 4: Frontend Performance & Quality
**Files:** `GraphCanvas.tsx`, `SearchModal.tsx`, `WorkspaceView.tsx`, `Modal.tsx`

1. **GraphCanvas.tsx**:
   - Remove `hoveredNode` from useEffect dependency array (use ref instead)
   - Use `{ passive: false }` on wheel event via `useEffect` + native addEventListener
   - Store hovered node in ref, read in render loop

2. **SearchModal.tsx**:
   - Add `AbortController` for search requests
   - Add `providerToken` to `useEffect` dependency array
   - Cancel previous request on new keystroke

3. **WorkspaceView.tsx**:
   - Move `useMemo` outside render prop (React rules of hooks)
   - Use `useCallback` for inline handlers passed to children

4. **Modal.tsx** — add focus trapping:
   - Trap Tab focus within modal when open
   - Auto-focus first focusable element

5. **AuthContext.tsx** — add `.catch()` to `getSession()`

### Stream 5: Database Hardening
**Files:** New migration `20260822_vault_constraints.sql`

1. Add `CHECK` constraints:
   ```sql
   CHECK (char_length(trim(github_owner)) > 0)
   CHECK (char_length(trim(github_repo)) > 0)
   CHECK (github_owner ~ '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$')
   CHECK (github_repo ~ '^[a-zA-Z0-9._-]+$')
   ```
2. Add explicit `WITH CHECK` to UPDATE policy
3. Add immutable column protection trigger for `id`, `created_at`

### Stream 6: CI & Tooling
**Files:** `ci.yml`, root `package.json`, `apps/web/package.json`, new `biome.json`

1. Add Biome as dev dependency
2. Create `biome.json` config
3. Add scripts: `lint`, `lint:fix`, `format`
4. Update CI pipeline:
   ```yaml
   - Lint (biome)
   - Typecheck (tsc --noEmit)
   - Test (vitest)
   - Build (vite build)
   - OpenAPI validation
   ```
5. Fix PNPM version mismatch

### Stream 7: Accessibility & Code Quality
**Files:** `NoteEditor.tsx`, `GraphCanvas.tsx`, `Modal.tsx`

1. NoteEditor autocomplete: add `role="listbox"`, `aria-selected`, `aria-activedescendant`
2. Offline search: filter out directories, search content not just filename
3. Autocomplete positioning (keep hardcoded for now, add TODO for cursor-following)
4. Update `AGENTS.md` architecture doc list to include `frontend.md`, `markdown-intelligence.md`, `offline-sync.md`

---

## New ADR Required

> [!IMPORTANT]
> **ADR-009: Server-Side GitHub Token Storage** — required because this changes the auth boundary between client and backend. Will be created as part of Stream 1.

## Execution Order

Streams 1-7 can largely run in parallel since they touch different files. The only dependency is:
- Stream 2 (API contract) and Stream 1 (token removal) both modify `api-v1/index.ts` — these must be merged carefully
- Stream 3 (btoa/atob) and Stream 1 (token removal) both modify `vault.ts` — same

I'll coordinate the `api-v1/index.ts` and `vault.ts` changes in a single pass.
