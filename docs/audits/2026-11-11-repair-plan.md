# Repository repair plan

Repair the 2026-11-11 audit on dev without pushing or deploying. Preserve GitHub as canonical storage, existing IndexedDB stores, and the versioned OpenAPI boundary.

1. Backend stream: align responses with OpenAPI, isolate credentials according to ADR-009, validate inputs/branches/paths, verify remote sync, deterministic handler tests and CI.
2. Frontend stream: safe wikilink rendering, authenticated asset resolution interface, frontmatter robustness, editor/graph interactions, awaited conflict actions, regression tests.
3. Integration stream: atomic queued writes and cache reconciliation, serialize replay, preserve draft overlay, structured HTTP errors, startup/auth readiness, editor race guards, safe logout, binary attachment handling, content-backed graph hydration and truthful status.
4. Update setup, architecture and audit disposition; add sibling registry/workspace entries in Yggdrasil.
5. Run frontend/backend tests, typechecks, build, OpenAPI validation and smoke checks; independently review resulting changes and fix additional defects.

Tests must exercise meaningful boundary behavior rather than merely mirror implementation. No finite test suite guarantees an application can never break. Hosted OAuth, migrations and deployment remain a separate release operation; this task prepares and verifies the local result.
