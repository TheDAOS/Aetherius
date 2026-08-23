# Aetherius Project Audit Report

This report consolidates the findings from a rigorous, multi-agent audit across the entire Aetherius codebase. The investigation covered frontend implementation, backend edge functions, database schema, and architectural compliance against `AGENTS.md`. 

The findings are severe. The current implementation flagrantly violates established non-negotiable rules, exposes critical security vulnerabilities, introduces catastrophic performance bottlenecks, and ignores API contracts.

---

## 1. Architectural & Compliance Violations (AGENTS.md)

### 🔴 Critical Rule Violations
*   **Rule #4 (Clients Must Not Perform Privileged GitHub Operations):** The rule strictly commands, *"Never expose GitHub credentials, access tokens... to the client."* However, `AuthContext.tsx` retrieves the GitHub access token and directly exposes it to the client. The Edge Function (`api-v1/index.ts`) expects this token to be passed via the `x-github-token` header. The PWA currently holds and manages privileged access tokens, which is a massive security failure.
*   **Rule #10 (Keep the MVP Simple):** `AGENTS.md` explicitly forbids the premature implementation of "Knowledge graphs," "Sophisticated synchronization," and "Conflict-resolution engines." 
    *   **Knowledge Graphs:** Implemented in `apps/web/src/components/graph/` (`GraphCanvas.tsx`, `GraphModal.tsx`) and `graphIndexer.ts`.
    *   **Sync & Conflict Resolution:** Implemented in `apps/web/src/services/storage/offlineDb.ts`, despite being designated for later phases.

### 🟡 Documentation Drift
*   **Undocumented Additions:** `AGENTS.md` lists the expected architecture documents, but `frontend.md`, `markdown-intelligence.md`, and `offline-sync.md` were added without updating `AGENTS.md`. This violates the rule: *"Do not introduce additional top-level architecture without a clear reason."*

---

## 2. API Contract Drift (OpenAPI vs. Edge Functions)

The Edge Function (`api-v1/index.ts`) completely misaligns with the API contract defined in `openapi/openapi.yaml`, violating Rule #6 (*"OpenAPI Must Stay in Sync"*):

*   **Error Schema Mismatch:** The backend returns `{ error: '...' }`, but OpenAPI explicitly requires an `Error` object containing `{ code, message }`.
*   **`GET /v1/files` (List files):** OpenAPI expects an optional query parameter `path` (`/v1/files?path=myfolder`). The Edge Function ignores this and extracts the path directly from the URL path.
*   **`GET /v1/files/{path}` (Get a single file):** OpenAPI specifies this should return a single `File` object. If the path points to a directory, the Edge Function returns an array-based `FileList`, violating the schema contract.
*   **`PUT /v1/files/{path}` (Update file):** OpenAPI requires `expectedSha` in the body. The Edge Function incorrectly expects `sha`.
*   **`DELETE /v1/files/{path}` (Delete file):** OpenAPI specifies no required query parameters. The Edge Function mandates a `sha` query parameter (`urlParams.get('sha')`) and returns a 400 if missing.
*   **Undocumented Headers:** The `x-github-token` header is undocumented in OpenAPI.

---

## 3. Backend Security & Performance

### 🔴 Security Vulnerabilities
*   **SSRF / Path Injection:** `vault.branch` (pulled from the DB) is unsafely interpolated into GitHub API URLs (e.g., `/repos/${owner}/${repo}/git/trees/${treeSha}`). A malicious payload in the branch field (e.g., containing `?`, `/`, or `../`) can alter the GitHub API request structure.
*   **Insecure CORS Policy:** The edge function sets `Access-Control-Allow-Origin: '*'` across the board for an authenticated API, enabling cross-origin requests from any site.
*   **No Input Validation:** In `POST /v1/vault`, `repository` and `description` are passed blindly to the GitHub API without validation or sanitization, potentially causing unexpected API behaviors or crashes.

### 🟡 Performance Bottlenecks
*   **OOM / Payload Bloat:** Calling `GET /v1/files` triggers `github.getTree(..., recursive=true)`. For large vaults, pulling the entire recursive tree into Edge Function memory and returning a massive JSON payload will easily time out or crash.
*   **Search API Rate Limiting:** `GET /v1/search` naively hits the rate-limited GitHub Search API (30 req/min). This will instantly exhaust the user's limit.
*   **Abysmal Search Fallback:** If the Search API fails, the backend fetches the *entire recursive repository tree* into memory just to do a client-side string match on file paths (omitting contents entirely).

### 🟡 Database Design Flaws
*   **Dangling Repositories on Failure:** In `POST /v1/vault`, the backend creates the GitHub repository *before* inserting the row into Supabase. If the Supabase insert fails, the repository is created on GitHub but orphaned from the app, leaving the user with a 500 error and no rollback.
*   **Missing Check Constraints:** The `vaults` table lacks `CHECK` constraints on `github_owner`, `github_repo`, and `branch`. Users can insert empty strings or spaces, permanently breaking future GitHub API calls.

---

## 4. Frontend Code Quality & UX

### 🔴 Zero Test Coverage
*   There are **ZERO** test files for React components, hooks, contexts, or routes (no `.test.tsx` or `.spec.ts` files). `AGENTS.md` strictly demands: *"New functionality should include appropriate tests... A task is not complete merely because the implementation compiles."*

### 🔴 Severe Performance Issues
*   **O(N²) Physics Engine in UI Thread:** `GraphCanvas.tsx` runs an O(N²) node repulsion simulation inside a `requestAnimationFrame` loop. A few hundred notes will cause the browser tab to freeze.
*   **Catastrophic String Parsing:** `graphIndexer.ts` builds unlinked mentions by running a nested loop over every single note's body, executing heavy regex replacements. Doing this synchronously on the UI thread will block rendering for large vaults.

### 🟡 React Antipatterns
*   **Unstable References in `useMemo`:** In `WorkspaceView.tsx`, `useMemo(() => buildGraphIndex(vaultState.files), [vaultState.files])` triggers on every file list update because `useVault.ts` frequently recreates the `files` array. This triggers full-graph rebuilds unnecessarily.
*   **Stale Closures & Bad Debouncing:** In `SearchModal.tsx`, the search `useEffect` misses `providerToken` in its dependency array. It manually debounces with a 100ms `setTimeout` but *does not abort* ongoing fetch requests, leading to race conditions where out-of-order network responses overwrite the final state.
*   **Missing Memoization:** `WorkspaceView.tsx` passes inline arrow functions down to complex child components (`NoteToolbar`, `NotePreview`), forcing unnecessary re-renders.

### 🟡 Accessibility (a11y) Nightmares
*   **No Focus Trapping:** `Modal.tsx` lacks focus trapping. Keyboard users can Tab out of the modal into background elements.
*   **Inaccessible Custom Inputs:** Autocomplete dropdowns (`NoteEditor.tsx`) and search lists (`SearchModal.tsx`) use unsemantic `<div>` elements and `onClick` handlers. They lack necessary ARIA attributes (`role="listbox"`, `role="option"`, `aria-activedescendant`) and fail to handle screen reader focus.
*   **Invisible Canvas:** `GraphCanvas.tsx` relies entirely on mouse coordinate math, offering zero fallback semantic HTML or keyboard navigation for screen readers.

### 🟡 General Code Quality
*   **TypeScript Laziness:** The codebase is riddled with `any`, such as `catch (err: any)` in `useVault.ts` and `vaultService.ts`, or raw `await this.invoke<any>`.
*   **Global Event Listener Clashes:** `WorkspaceView.tsx`, `NoteEditor.tsx`, and `SearchModal.tsx` register global `window.addEventListener('keydown')` handlers without a centralized shortcut manager, guaranteeing event clashes when multiple overlays are open.
