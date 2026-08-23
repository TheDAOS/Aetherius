# Aetherius Project Audit Report (Pass 2 - Exhaustive Deep Dive)

Following the initial high-level investigation, this report details the results of a rigorous line-by-line code review, static analysis, dependency audit, and database schema examination.

## 1. Tooling, Dependencies, & Static Analysis Audit

### 🚨 Missing Static Analysis Pipeline
- **No Linter Configured:** `package.json` contains no ESLint, Biome, or Prettier dependencies. The codebase is currently unlinted.
- **CI Blindspot:** `.github/workflows/ci.yml` **ONLY** runs `openapi/openapi.yaml` validation. It completely skips testing, building, and typechecking, directly violating `AGENTS.md` CI requirements.

### ⚠️ Dependency & Workspace Configuration
- **PNPM Version Mismatch:** The root `package.json` specifies `"packageManager": "pnpm@11.22.0"` but `devEngines` uses `"^11.22.0"`, resulting in a mismatch warning on every install.
- **TypeScript `skipLibCheck` bypass:** `tsconfig.json` relies on `skipLibCheck: true`. While standard, combined with the extreme overuse of `any` types throughout the codebase, type safety is largely an illusion. `pnpm typecheck` technically passes `tsc --noEmit`, but only because the types are bypassed using `any`.

---

## 2. Line-by-Line Frontend Review (`apps/web/src/`)

### 🔴 Critical Encoding Crash (`vault.ts`)
*   **Lines 121, 161, 236, 245:** The code uses `btoa(params.content)` to encode markdown before sending it to the backend. `btoa` does not natively support UTF-8 characters. If a user saves a note containing emojis or non-Latin characters, `btoa` throws a fatal `DOMException: InvalidCharacterError` and fails to save.
*   **Line 91:** `atob(...)` is used to decode incoming files, which will result in garbled text (or throw an error) for multi-byte UTF-8 characters returning from the GitHub API.

### 🔴 Unhandled Promise Rejections (`AuthContext.tsx`)
*   **Lines 30-35:** `supabase.auth.getSession()` is called without a `.catch()` block. If the network request fails, `setLoading(false)` is never called, trapping the application in an infinite loading state.

### 🔴 `GraphCanvas.tsx` Memory/Performance Leaks
*   **Lines 248 & 312:** The main physics `requestAnimationFrame` loop `useEffect` includes `hoveredNode` in its dependency array. Because `setHoveredNode` is called on *every single mouse move*, the entire simulation loop is unnecessarily torn down and restarted on every frame the mouse moves, causing massive stuttering.
*   **Line 333:** `e.preventDefault()` is called on a React Synthetic `onWheel` event, which fails in modern browsers (Passive Event Listener violation).

### 🟡 Search Modal Race Conditions (`SearchModal.tsx`)
*   **Lines 32-49:** The asynchronous search call inside the `setTimeout` lacks an `AbortController`. If a user types quickly, the network response for an old keystroke might resolve *after* a new keystroke, overwriting the UI with stale data. Also missing `providerToken` in the `useEffect` dependency array (Line 52), risking a stale closure.
*   **Offline Search Logic Flaw (`vault.ts` Lines 321-323):** The fallback offline search iterates over `list.entries` without filtering out directories. Directories will incorrectly show up as matching "files" in search results.

---

## 3. Line-by-Line Backend Review (`supabase/functions/api-v1/index.ts`)

### 🔴 Critical Security Vulnerability: SSRF & Path Injection
*   **Lines 163-181 (`github.getTree`):** The edge function fetches the full tree using `vault.branch` (which is pulled directly from the Supabase database). There is NO sanitization of this branch name in the DB. A malicious payload injected into `vault.branch` (e.g., `../refs/heads/...`) will alter the constructed GitHub API request, enabling Server-Side Request Forgery or Path Injection.

### 🔴 OOM (Out of Memory) Crash Vector
*   **Line 164 (`github.getTree(..., true)`):** When calling `GET /v1/files` with no path, the API passes `recursive=true` to `github.getTree`. For a vault with 10,000+ files, this pulls an enormous JSON tree into the Edge Function's limited memory space, then maps over it synchronously, causing a catastrophic OOM crash or execution timeout.

### 🟡 Abysmal API Design
*   **Lines 233-241 (`PUT /v1/files/{path}`):** The request body destructured variables are `{ path: bodyPath, content, sha, commitMessage }`. The OpenAPI spec demands `expectedSha`. The implementation completely disregards the spec contract.
*   **Lines 267-275 (`DELETE /v1/files/{path}`):** The function demands a `sha` query parameter (`const sha = urlParams.get('sha')`), throwing a 400 error if missing. The OpenAPI contract dictates no query parameters for deletions.

---

## 4. Database Schema Audit (`20260820082558_init_vaults.sql`)

### 🔴 Data Integrity Flaws
*   **Lines 5-7 (Empty Strings Allowed):** 
    ```sql
    github_owner text not null,
    github_repo text not null,
    branch text not null default 'main',
    ```
    While `NOT NULL` is present, there is NO `CHECK (char_length(trim(github_owner)) > 0)`. The database will happily accept empty strings (`''`) or whitespace (`'   '`), completely breaking the GitHub API paths downstream.
*   **Missing Validation Constraints:** There is no regex validation on `github_owner` or `github_repo`. Invalid repository names (e.g., containing spaces or URL-breaking characters) can be inserted, silently poisoning the vault configuration.

### 🟡 RLS Policy Vulnerabilities
*   **Lines 24-26 (UPDATE Policy Weakness):**
    The `UPDATE` policy lacks an explicit `WITH CHECK (auth.uid() = user_id)` clause. While Postgres 14+ implicitly copies the `USING` clause to `WITH CHECK`, relying on implicit behavior for security-critical RLS policies is a bad practice.
*   **Missing Column Protection:** There is no trigger or column-level privilege revocation to prevent authenticated users from arbitrarily updating immutable columns like `created_at` or `id`.
