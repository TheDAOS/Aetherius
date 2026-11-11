# Repair verification and second review — 2026-11-11

Branch: `dev`. Based on baseline `da85634` and the findings in [the original review](2026-11-11-repository-review.md). Changes remain local; no hosted migration, deployment, push, or merge was performed.

## Disposition of the original findings

| Finding | Repair and regression coverage |
| --- | --- |
| 1 — Response mismatch | Handler emits OpenAPI success/error envelopes; service parses real SDK HTTP errors. Native handler tests and real-browser SDK→handler workflows cover this boundary. |
| 2–3 — Cache erasure and draft overwrite | Atomic reconciliation preserves unchanged bodies and pending drafts, invalidates changed bodies, and rejects stale account/branch results. Service/IndexedDB and delayed-response tests cover these cases. |
| 4 — Repeated offline saves | Draft and queue updates commit atomically; related offline mutations coalesce. Serialized replay, cross-tab Web Locks and identical-content acknowledgements protect retries. Browser tests cover repeated saves and two tabs. |
| 5 — Hidden conflicts | Structured HTTP status/code survives SDK errors; HTTP failures do not masquerade as queued network successes. 400/401/403/409/422/500 and transport-failure tests distinguish behavior. |
| 6 — Logout data loss | Account-scoped saved drafts survive sign-out; unsaved editor text is guarded. Both failed and successful logout preserve the queue. |
| 7 — Credential exposure | Browser token-table privileges/policies revoked by migration; verified identity and server-only client mediate token storage. Browser session storage strips provider credentials, including legacy persisted sessions. Actual PostgreSQL role assertions and browser callback tests cover the boundary. OAuth bootstrap is still transiently client-visible by design; this is documented honestly. |
| 8 — Broken images | Binary content is encoded once, uploading does not select the asset, and private raster assets resolve through the authenticated service. Browser test compares uploaded bytes and checks note selection. |
| 9 — False synchronization | Sync verifies the remote selected tree; indicators distinguish pending/running/failure and do not claim an unmeasured server queue. Pending mutations no longer disable manual sync. |
| 10 — Startup/token readiness | Initial token transfer finishes before workspace readiness; same-account reauthentication preserves the mounted editor. Missing vault is distinct from API failure. Startup replay is covered. |
| 11–12 — Branch/setup bugs | Reads/writes use selected branch; new setup uses returned default branch and propagates seed failures. Incomplete setup with denied cleanup returns actionable recovery instructions. |
| 13 — URL paths | Both transport boundaries encode filename segments; reserved punctuation and traversal validation are tested. |
| 14 — Ghost deleted notes | Remote missing paths are removed transactionally, with pending local operations retained. |
| 15 — Editor races | Selection/load guards, dirty-content preservation, readonly loading/branch transitions and save revision checks protect typing. Delayed load/save/create/resolve tests cover data-loss triggers. |
| 16 — Wikilinks | Safe Markdown-it tokens replace HTML-string injection. Raw HTML stays disabled; browser tests navigate canonical paths and frontmatter aliases. |
| 17 — Empty graph | Markdown bodies hydrate with bounded concurrency; the active editor body feeds the derived index. Existing parser/indexer and new integration tests verify content reaches relationships. |
| 18 — Frontmatter crash | Title normalization preserves string semantics; inline arrays and aliases are parsed. Numeric/boolean/quoted values and code-fence cases have regression tests. |
| 19 — Relative links/private assets | Relative Markdown paths resolve in vault space; assets use authenticated object URLs, not the PWA host. |
| 20 — Conflict actions | Dialog awaits actions, disables duplicate submission and displays failures. Resolution uses the latest draft, handles the queue, updates active state and preserves subsequent typing. |
| 21 — Hidden search errors | Failures are explicit; offline search includes cached bodies. GitHub pagination and truncated-tree failures are tested. Nondefault branches use a bounded branch-aware scan rather than the default-branch search index. |
| 22 — Contract drift | OpenAPI documents envelopes, Base64, DELETE SHA, move/connect/branch operations and expected-branch guards. CLI validation passes; actual handler/SDK workflow tests complement schema validation. |
| 23 — Missing verification | CI runs coverage-tested frontend logic, native Deno handler tests/typecheck, browser workflows, real database migrations/role tests, build, lint and OpenAPI validation. |

Additional repaired controls/workflows: existing private repository connection, branch selection, atomic rename/move, custom folders through note paths, template selection/expansion, note hash URLs and browser history, autocomplete arrows/Escape, graph drag-versus-click, title/alias mention conversion, proper input labels, and removal of the fake reset control. Git does not represent empty folders; this UI creates folders by creating notes within them. Folder-wide moves are not implemented.

## Additional findings from the second review

These were found and fixed during independent follow-up review and integration testing:

- Late account-A requests could target account-B storage or credentials: operations now pin account/database scope and bearer, with delayed account-switch tests.
- Same-account asynchronous token exchange could unmount a dirty workspace: auth readiness no longer remounts it, with a mounted-editor regression test.
- Two tabs could replace/delete the same queued mutation during replay: shared browser locks serialize mutating operations; atomic cache insertion checks pending drafts. A two-tab real-browser workflow passes.
- Late old-branch bodies/listings could repopulate a newly selected branch: cache transactions verify vault identity/branch and branch changes atomically swap derived storage.
- Another device could change the globally selected branch before offline replay: mutations retain their expected branch; the handler rejects mismatches before any GitHub operation. Returning to the original queued branch preserves drafts. Pending notes are not relabelled as another branch's notes.
- Database outages were returned as missing-vault 404s: they now remain server errors, covered across file/search/sync paths.
- Dirty typing during creation or resolution could be discarded: revision-aware handlers preserve it; branch changes lock editing while pending.
- Manual sync was disabled whenever changes were pending: only an active run disables the button.
- Browser back from a note to the root did not restore default selection: history navigation now handles the root without pushing another history entry.

No unresolved critical/high-severity defect was identified in the tested local workflows after these repairs. This is a bounded review, not a guarantee that every possible failure has been eliminated.

## Verified checks

- 212 frontend/service/auth/parser/IndexedDB tests pass, including critical service coverage thresholds. The vault service reports approximately 96% statement and 88% branch coverage; broader UI/animation coverage remains incomplete.
- 26 native Deno tests pass; Edge entrypoint Deno typecheck passes.
- Eight headless Chrome workflows pass through real application UI, Supabase SDK, VaultService, IndexedDB and the actual Edge handler. External auth/GitHub/database persistence is synthetic in this suite.
- All migrations apply to an isolated real PostgreSQL 17 database. Assertions verify own-vault access, cross-user denial, immutable IDs, denial of browser token-table reads, and server-role token access. Disposable containers are removed after testing.
- Frontend typecheck, production build, OpenAPI CLI validation and error-level lint pass. 107 warning-level lint diagnostics and 9 informational diagnostics remain; they are not suppressed. The production bundle is about 555 kB uncompressed (173 kB gzip) and still produces the bundle-size warning.
- Graphify AST index refreshed locally without an LLM/API call. SQL graph extraction is unavailable because the optional SQL parser is absent; SQL behavior was verified by the actual PostgreSQL assertions instead.

The original baseline had 114 frontend tests. New tests assert corrected behavior; temporary initial probes that asserted faulty behavior were not retained as regression tests. Coverage thresholds protect the critical vault service and intelligence modules. Other UI/animation/error branches still have incomplete coverage and are reported rather than claimed to meet a universal 80% goal.

## Release and scope limits

- Hosted GitHub OAuth settings, real private-repository permissions/rate limits, deployed migrations/Edge runtime and install/offline behavior on physical PWA devices still require release validation. The browser callback test emulates the external provider; it does not log in to GitHub.
- The token-boundary migration and corresponding Edge deployment must be released together. Source changes do not secure an already running older deployment.
- Images support PNG/JPEG/GIF/WebP/AVIF. Offline reading requires downloaded content. Nondefault-branch search deliberately limits scanning to 100 Markdown notes of at most 1 MB each, with explicit errors on exceeding the bound. No native iOS client was added.
- Web Locks provide cross-tab mutation coordination in supporting browsers. The per-instance queue remains the fallback where the browser lacks that API; equivalent cross-tab serialization is not promised there.
- A finite regression suite cannot guarantee that future changes never introduce bugs. CI now covers the integration boundaries that previously allowed the main vault workflow to break undetected.

## Workspace request

Added `Aetherius` to `/home/iris/Documents/projects/Yggdrasil.code-workspace`, preserving the existing Yggdrasil, Ember and protfolio-me entries. The user's correction requested this VS Code workspace file; Yggdrasil's registry/state files were not changed.
