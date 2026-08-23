# Aetherius Project Audit Report (Final Exhaustive Pass)

This final report compiles the findings of all three redundant Principal Auditor subagents. The investigation uncovered catastrophic security vulnerabilities, guaranteed data loss scenarios, and severe architectural violations.

## 1. 🚨 CRITICAL Security Vulnerabilities

### XSS Vulnerability in Markdown Preview
*   **Location:** `apps/web/src/components/editor/NotePreview.tsx`
*   **Flaw:** The manual regex-based markdown parser (`renderFormattedInline`) completely fails to sanitize URLs for images and links. An attacker (or accidental copy-paste) can inject malicious payloads like `[Click me](javascript:alert(1))` or `![hack](" onerror="alert(1))`. React binds these directly to `href`/`src` attributes, enabling arbitrary JavaScript execution.

### Severe Cross-Account Data Leak (Privacy Violation)
*   **Location:** `apps/web/src/contexts/AuthContext.tsx` & `offlineDb.ts`
*   **Flaw:** The IndexedDB instance is shared globally without user-specific namespacing. When a user logs out, `signOut` fails to clear the offline database. If User A logs out and User B logs in on the same machine, User B has full access to User A's locally cached, private vault files.

### SSRF & Path Injection (Edge Functions)
*   **Location:** `supabase/functions/api-v1/index.ts`
*   **Flaw:** The edge function fetches the tree using `vault.branch` directly from the database without sanitization. A malicious payload in `vault.branch` (e.g., `../refs/heads/...`) alters the GitHub API request structure, enabling Server-Side Request Forgery.

### Token Leakage (AGENTS.md Rule #4 Violation)
*   **Location:** `api-v1/index.ts` & `vault.ts`
*   **Flaw:** The client explicitly passes `x-github-token` to the Edge Function, violating the rule: *"Never expose GitHub credentials, access tokens... to the client."*

---

## 2. 🚨 CRITICAL Data Loss & Crash Vectors

### Guaranteed Data Loss on File Switch
*   **Location:** `apps/web/src/hooks/useVault.ts`
*   **Flaw:** If a user is typing (setting `isDirty = true`) and clicks a different file in the sidebar, the `useEffect` instantly triggers `loadActiveFile(activeFilePath)`. This forcefully overwrites the `content` state, silently destroying all unsaved changes without any warning prompt.

### App-Breaking Unicode/Emoji Crashes
*   **Location:** `apps/web/src/services/vault.ts`
*   **Flaw:** The application uses native `atob()` and `btoa()` to encode/decode markdown. `btoa()` only supports Latin-1. Typing a single emoji (🚀) or non-English character throws a fatal `DOMException` and completely breaks saving/loading.

### Edge Function OOM (Out of Memory) Crash
*   **Location:** `supabase/functions/api-v1/index.ts`
*   **Flaw:** Hitting `GET /v1/files` (without a specific path) passes `recursive=true` to `github.getTree`. For large vaults, this pulls the entire JSON tree into the Edge Function's limited memory space, guaranteeing an OOM crash or execution timeout.

---

## 3. ⚠️ UX, Logic, and Performance Flaws

### Broken Offline Full-Text Search
*   **Location:** `apps/web/src/services/vault.ts`
*   **Flaw:** The fallback offline search claims to search IndexedDB files, but it *only filters by filename*. It completely fails to search the actual contents of the notes. Furthermore, it fails to filter out directories from the results.

### Hardcoded UI Positioning for Autocomplete
*   **Location:** `apps/web/src/components/editor/NoteEditor.tsx`
*   **Flaw:** The `[[` wikilink autocomplete popup uses a hardcoded absolute position (`bottom-6 left-6`). The dropdown does not follow the user's cursor, appearing at the bottom of the screen even if the user is typing at the top.

### Physics Engine Memory Leak
*   **Location:** `apps/web/src/components/graph/GraphCanvas.tsx`
*   **Flaw:** The main physics `requestAnimationFrame` loop uses a `useEffect` that depends on `hoveredNode`. Because `setHoveredNode` fires on every mouse move, the entire simulation loop is torn down and restarted constantly, causing massive stuttering.

### Markdown Rendering Bugs
*   **Location:** `apps/web/src/components/editor/NotePreview.tsx`
*   **Flaw:** Lines starting with `# ` (headers) explicitly skip the `renderFormattedInline` pass. Any bolding, italics, or links inside headers will render as raw markdown.

---

## 4. 🛠 Tooling & Database Deficiencies

*   **Missing CI Checks:** `.github/workflows/ci.yml` completely skips testing, building, and typechecking.
*   **No Linter Configured:** `package.json` contains no ESLint, Biome, or Prettier dependencies.
*   **Zero React Tests:** The entire `components`, `hooks`, and `routes` directories lack any unit tests.
*   **Database Constraints:** `vaults` table lacks `CHECK (char_length(trim(github_owner)) > 0)` and regex validation, allowing empty strings or spaces to silently poison API calls.
*   **RLS Weakness:** The `UPDATE` policy lacks an explicit `WITH CHECK` clause and fails to protect immutable columns (`id`, `created_at`).
