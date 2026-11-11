# Aetherius repository review — 2026-11-11

Reviewed branch: `dev`, commit `da85634`. Reviewers: primary agent plus two sub-agents covering frontend and backend. No application fixes, migrations, cloud changes, or GitHub writes were made.

Remediation: see [repair verification and second review](2026-11-11-repair-verification.md) for the local fixes and current verification status. This document records the original baseline findings.

## Assessment

The repository contains substantial frontend and backend code, but its core end-to-end vault workflow is broken. The most immediate blocker is incompatible response shapes between backend and client. Independently, offline cache and mutation handling can lose locally visible content, strand edits, and conceal failures. Several visible features exist as disconnected components or success stubs.

Fixing the response envelope alone will expose additional failures below. Findings involving successful service responses were exercised with contract-shaped fixtures to isolate those downstream defects; they should not be read as evidence that today's live backend already reaches those paths successfully.

Priorities: P1 = core workflow blocker, credential-boundary failure, or serious data-loss risk. P2 = broken feature or meaningful reliability/contract gap. P3 = smaller usability or completeness issue. This is a source and local reproduction review, not an exhaustive security certification or live deployment audit.

## Verification

- Frozen dependency installation succeeded.
- `pnpm test`: 16 test files, 114 tests passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; main JavaScript bundle approximately 622 kB uncompressed / 191 kB gzip, with Vite's large-chunk warning.
- `pnpm lint`: exit 0, but 112 warnings and 9 informational diagnostics. Passing does not mean warning-free.
- Seven temporary Vitest probes reproduced response unwrapping failure, empty listing, content-cache erasure, overwrite of pending local drafts, stale cache after remote deletion, swallowed HTTP 409, and stale-SHA queue replay. These asserted the observed faulty behavior; they are reproductions, not regression tests asserting correct behavior. Probe source was moved outside the repository to `/tmp/aetherius-review-probes.test.ts` after execution.
- Frontend sub-agent reproduced escaped wikilink HTML, metadata-only graph edges disappearing, and numeric/boolean title crashes using actual parser/indexer/renderer code.
- Backend sub-agent executed the actual handler and GitHub wrapper in an isolated Node harness with mocked dependencies and no network. Confirmed raw responses, success-only sync stubs, omitted read branch, suppressed template errors, filename URL interpretation, and malformed-JSON status.
- Deno is not installed on this machine; the native backend suite was not executed. No authenticated browser session, hosted database, OAuth configuration, real GitHub vault, or installed-device PWA was tested. OpenAPI CLI validation was not run.

## P1 findings

### 1. Every successful backend response is unwrapped incorrectly

Sources: `apps/web/src/services/vault.ts:24-37`; `supabase/functions/api-v1/index.ts:178-184`, `500-504`, `581-590`, `636-644`; `openapi/openapi.yaml:95` onward.

The SDK returns the parsed JSON in `data`. The backend sends `{id, owner, repository, branch}`, `{entries}`, and plain file objects. The client returns `data.data`. Therefore valid vault responses become undefined, file listings become empty, and file reads fail into the cache fallback. Workspace treats a missing vault as a reason to show onboarding (`WorkspaceView.tsx:64-65`), including for existing users. Writes can reach GitHub successfully but then be treated as failures when the client reads `res.path`, creating an offline mutation for an operation already committed. Both backend and frontend must be tested together against the canonical envelope.

### 2. File-list refresh erases cached note bodies

Sources: `services/vault.ts:82-102`; `services/storage/offlineDb.ts:91-101`.

Listing constructs metadata-only file objects and `saveFiles` replaces existing IndexedDB records with those objects. Reading a note online and then refreshing the file list removes its cached content. Offline, `getFile` can return a record with undefined content, which the editor renders as empty. Ordinary save, create, refresh, and sync flows all list files. Reproduced independently of finding 1.

### 3. Pending offline drafts are not protected from remote reads

Sources: `services/vault.ts:113-135`, `229-237`, `328-329`.

An offline update stores a local draft and queues a mutation. Once online, `getFile` fetches the older remote version and replaces that local record without checking pending mutations. A list refresh likewise replaces it with metadata. The queue may still retain the draft, but the visible editor/cache loses it and there is no draft-recovery UI. Reproduced remote text replacing a pending local draft while its mutation remained queued.

### 4. Repeated offline saves cannot replay reliably

Sources: `services/vault.ts:194-199`, `231-237`, `286-324`.

Two offline saves to the same file both enqueue its original SHA. After replaying the first, GitHub has a new SHA; the second still submits the old one and conflicts. A create followed by an offline update has the same dependency problem because the update has no SHA from the create. Replay ignores write results, does not coalesce or rebase related operations, and stops the entire queue at the first error. Sync has no mutual-exclusion guard, so overlapping manual/reconnect syncs can replay the same mutation twice.

### 5. Real HTTP conflicts and rejected writes can appear saved

Sources: `services/vault.ts:29-30`, `215-239`; `hooks/useVault.ts:144-160`.

The installed SDK's `FunctionsHttpError` message is `Edge Function returned a non-2xx status code`; the actual HTTP status/body are in its context. `invoke` throws it without decoding that context. Update's string matching cannot identify a real 409 and queues it as an offline success. The hook then clears `isDirty`, so the conflict banner does not appear. Other rejected writes, including authentication/validation failures, also become optimistic successes. Reproduced using an actual `FunctionsHttpError` containing a 409 response.

### 6. Signing out can permanently delete saved-but-unsynced notes without warning

Sources: `contexts/AuthContext.tsx:97-105`; `routes/SettingsModal.tsx:144-154`; `WorkspaceView.tsx:319`; `hooks/useVault.ts:149-150`.

Sign-out clears all files, metadata, and queued mutations. The warning checks editor `isDirty`, not pending mutations. Saving offline clears that flag even though nothing reached GitHub, so sign-out can erase the only copy with no warning. Clearing occurs before attempting auth sign-out, so even a failed sign-out can lose the queue.

### 7. GitHub credentials are not isolated from browser JavaScript

Sources: `api-v1/index.ts:76-78`, `114-120`, `136-147`; `migrations/20260822230100_user_github_tokens.sql:14-16`; `contexts/AuthContext.tsx:38-50`, `62-74`; ADR-009.

The column named `encrypted_token` receives the raw token. The backend reads it with the user's JWT, and the migration explicitly permits that user to SELECT the row. Wherever table privileges allow the backend's query, browser code with the same session can make the same query. AuthContext also retains the provider-bearing session instead of removing the token after transfer. RLS restricts other users but does not enforce the claimed server-only credential boundary. This is not proof of a current XSS exploit; it means a compromised client could retrieve the broad `repo` token despite ADR-009's claimed protection. Hosted table grants were not inspected.

### 8. Image attachment does not preserve image bytes or the active note

Sources: `WorkspaceView.tsx:140-156`; `services/vault.ts:165-166`; `hooks/useVault.ts:190-192`.

FileReader produces base64, which is sent as text to `createFile` and base64-encoded again. GitHub receives text containing base64 rather than image bytes. The generic create-note hook then selects the uploaded image, while the attachment handler appends image Markdown to the previous note content. This can switch editors and discard/misapply the intended note edit. A separate binary asset flow is needed.

## P2 findings

### 9. Sync status is fabricated rather than measured

Sources: `api-v1/index.ts:393-448`; `services/vault.ts:344-357`; `components/layout/Sidebar.tsx:136-139`.

Backend status reports idle and a fresh timestamp without querying GitHub; POST sync returns a random completed operation without work. The client also reports `Vault synchronized` if status fetching fails and no queue remains. Sidebar displays `GitHub Synced` unconditionally. The frontend does implement mutation replay, but these indicators do not verify its success or remote reconciliation.

### 10. Startup and authentication readiness are not coordinated

Sources: `contexts/AuthContext.tsx:38-52`, `62-75`; `hooks/useVault.ts:74-93`, `24-52`; `WorkspaceView.tsx:64-65`.

Workspace can mount before GitHub token storage completes; failures are only logged. Initial vault requests may return TOKEN_REQUIRED and be treated as missing vault state, with no retry tied to token readiness. Pending mutations replay on an `online` event or manual action, not automatically when an app opens already online. Network/API failures and a genuinely absent vault are conflated in onboarding.

### 11. Reads and writes do not consistently use the vault branch

Sources: `api-v1/index.ts:468-482`, `550-554`, `625-633`; `_shared/github.ts:70-71`.

Tree listing and writes use the configured branch, but content reads omit `ref` and use the GitHub default branch. A non-default vault branch can list one set of files, load another version, and save with the wrong SHA. This concerns a user's vault branch, independently of this application's development branch.

### 12. Initialization silently succeeds on incomplete or wrongly targeted vaults

Sources: `api-v1/index.ts:244-261`; `_shared/github.ts:174-196`.

Repository creation's returned default branch is discarded and `main` is hardcoded. Every template-write failure is caught and logged rather than propagated. The handler can store a vault and return 201 even after every template write failed. Accounts configured with another initial branch are a concrete trigger; permission/rate-limit/network failures also yield partial vaults presented as complete.

### 13. File paths are interpolated as URL syntax

Sources: `services/vault.ts:117`, `205`, `245`; `_shared/github.ts:70-71`, `93`, `112`.

Neither layer safely encodes filename segments. `notes/C# intro.md` becomes a fragment and `notes/why?.md` becomes a query, so operations can target truncated/different paths. The UI accepts names not restricted to URL-safe characters. Encode at both transport boundaries while preserving path separators.

### 14. Deleted remote files remain in offline storage

Sources: `services/vault.ts:101-110`; `services/storage/offlineDb.ts:91-101`.

List refresh only upserts returned entries. Missing remote paths are never reconciled or removed. A file deleted elsewhere disappears online and reappears offline, potentially allowing stale edits/deletions against a nonexistent file. Reproduced an empty remote list followed by a nonempty offline list. Reconciliation must preserve pending local creates/deletes rather than blindly replacing the cache.

### 15. File loading and saving have no stale-request protection

Sources: `hooks/useVault.ts:94-117`, `128`, `138-150`.

Changing paths does not cancel previous loads or clear the previous active file. With slow responses, selecting A then B can finish with B's path and A's content/SHA. Saving while a new file is loading also combines the new path with the previous active file. Similarly, editing during an in-flight save can leave newer editor content marked clean when the older save completes. These are source-identified asynchronous races, not timing-tested browser incidents.

### 16. Wikilinks render escaped HTML instead of clickable links

Sources: `components/editor/NotePreview.tsx:23-24`, `87-101`.

The preprocessing step inserts raw `<span>` markup, then markdown-it with `html:false` escapes it. Users see literal markup around `[[Target]]`; there is no `.wikilink` element for click handling. Reproduced with the renderer configuration. Do not fix by simply enabling untrusted raw HTML.

### 17. Graph/backlink/tag features receive metadata without content

Sources: `WorkspaceView.tsx:53-57`; `services/vault.ts:82-102`; `intelligence/graphIndexer.ts:79`.

The graph consumes the listing array. That array lacks note bodies and frontmatter; opening a note does not merge its content back into `files`, and unsaved editor content is also separate. Online graph nodes therefore lack real relationships, tags, aliases, and mentions. Reproduced one edge with note contents versus zero with the equivalent metadata-only files.

### 18. Frontmatter can crash rendering and standard YAML is misparsed

Sources: `intelligence/markdownParser.ts:45-62`, `128-144`; `graphIndexer.ts:101`; `WorkspaceView.tsx:53-57`.

Numeric/boolean title values, including quoted `title: "2026"`, are coerced and returned as nonstrings. Indexing calls `toLowerCase()` and throws during workspace rendering when cached content reaches it. Inline YAML arrays such as `tags: [research, work]` become one literal tag; aliases are similarly wrong. All were reproduced. No workspace error boundary contains the title crash.

### 19. Relative Markdown links and private images use the wrong origin

Sources: `components/editor/NotePreview.tsx:36-65`.

Relative image/link URLs are passed through as normal browser URLs. They request the PWA host instead of resolving against the active note's location in the private vault. Ordinary `[Other](other.md)` opens a new app URL rather than selecting a vault file. There is no authenticated asset retrieval/resolution layer, so even correctly uploaded assets would not display through this path.

### 20. Conflict resolution is incomplete and disconnected from queued conflicts

Sources: `routes/ConflictModal.tsx:81-107`; `WorkspaceView.tsx:285-310`; `hooks/useVault.ts:24-47`.

Modal callbacks are async in the parent but typed/called as void and the dialog closes immediately. Write failures are not caught there, duplicate actions are not locked, and force overwrite refreshes metadata without updating the active SHA/dirty/conflict flags. A queue replay failure only sets a generic error; it does not open resolution for the failed mutation, and resolution does not remove/rebase that queued mutation. Conflict copy's immediate reload also closes over the previously active path.

### 21. Search failures are hidden and fallback is not content search

Sources: `api-v1/index.ts:331-378`; `_shared/github.ts:122-124`; `services/vault.ts:396-410`; `routes/SearchModal.tsx:56-57`.

Search failure degrades to filename/path matching; fallback failure is suppressed into successful empty results. Offline search only matches filenames even when bodies are cached. The UI suppresses errors too, making outage/authorization failures look like no matches. GitHub search pagination and recursive-tree truncation are not handled, so larger vaults can be silently incomplete.

### 22. OpenAPI cannot currently serve as a reliable shared client contract

Sources: `openapi/openapi.yaml:282-302`; `api-v1/index.ts:676`; plus finding 1.

DELETE requires an expected SHA in implementation but declares no request body or SHA parameter in the spec. Base64 content encoding is insufficiently specified. Invalid JSON becomes 500; deletion conflicts are not mapped consistently; all 422 write-validation errors are called SHA conflicts. Schema-only linting does not compare real handler responses to the spec.

### 23. The verification suite misses the critical system boundaries

Sources: `hooks/useVault.test.ts:6-15`, `39-48`; `supabase/functions/api-v1/index.test.ts:11-20`; root `package.json:8`; `.github/workflows/ci.yml:40-48`.

The hook test only checks defaults; its service mock omits methods used by initialization. There are no existing real VaultService integration tests or end-to-end OAuth → vault → create/edit → reload → offline → reconnect checks. Backend tests statically import the handler before top-level Deno.serve stubbing can execute under ESM, include an unmocked auth network call, and are never invoked by CI. Root typecheck/build cover web, not the Deno backend. This explains why all 114 tests pass despite finding 1.

## Smaller defects and missing workflows

- Wikilink autocomplete keyup resets arrow-key selection to zero and reopens after Escape (`NoteEditor.tsx:70-90`, `151-165`).
- Graph dragging uses the node's updated position to detect a click on release, so a drag commonly selects the note and closes the graph (`GraphCanvas.tsx:312-317`, `350-360`).
- Link-mention conversion searches the filename, while detection can match frontmatter title/alias; it can commit unchanged content or change the wrong occurrence (`WorkspaceView.tsx:88-104`).
- “Reset Demo Vault” is a dead production-facing control: `resetToDefaults` only logs a warning (`SettingsModal.tsx:107-125`; `services/vault.ts:415-416`).
- Existing-repository connection/import, branch selection, rename/move/folder management, template application, and note URL/history routing have no completed UI flows. These are completeness gaps, not necessarily regressions or agreed MVP requirements. Native iOS is explicitly future scope.
- README marks GitHub integration as a future phase although code already exists, and does not provide a reproducible environment/OAuth/backend setup sequence. There is no environment example. Missing frontend environment values silently use localhost and a placeholder anon key (`supabaseClient.ts:3-6`).
- Fresh database privileges remain unverified: migrations define RLS but no explicit Data API grants, while config comments describe new objects not being auto-exposed (`config.toml:19-24`). Test a clean local migration/reset before claiming fresh setup works. This is a setup concern, not a confirmed failure of the hosted project.

## Recommended repair order

1. Establish one tested API response/error contract, including real SDK HTTP errors and DELETE SHA/base64 semantics. Prove existing-vault login and basic read/write against the actual handler.
2. Protect unsynced drafts: merge listing metadata, overlay pending operations, handle stale SHAs/dependent mutations, serialize sync, warn on logout, and add recovery paths. Test repeated offline saves and reconnect/restart.
3. Enforce the intended credential boundary and wait for token readiness before loading vaults.
4. Correct branch handling, initialization failures, and URL encoding; stop reporting fabricated sync success.
5. Repair attachments and private asset resolution, then wikilinks, content-fed indexing, frontmatter, editor races, and conflict actions.
6. Put backend, API-contract, and end-to-end workflow tests into CI; update setup and project-status documentation. Address optional missing workflows after the reliable vault path is established.
