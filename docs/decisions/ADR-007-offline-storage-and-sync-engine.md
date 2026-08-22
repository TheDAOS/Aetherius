# ADR-007: Offline Storage, Mutation Queue, and Conflict Resolution

**Status:** Accepted

## Context

Aetherius is an offline-capable Progressive Web App (and future Swift/iOS client). Users must be able to read and edit their notes with zero latency, even with intermittent or absent network connectivity.

However, non-negotiable architectural rule #1 (`AGENTS.md`) mandates that **GitHub is the canonical source of truth**, and rule #3 mandates that **Supabase/client storage is not the canonical note store**.

The system must support local offline caching and optimistic mutation queuing while guaranteeing that:
1. Local storage remains strictly derived state.
2. Canonical note content is not locked into a proprietary database.
3. Network reconnections replay pending mutations in chronological sequence.
4. Concurrent remote edits produce clear conflict resolution without silent data loss.

## Decision

1. **Client-Side Storage (IndexedDB / SwiftData)**:
   - The client uses a native IndexedDB instance (`aetherius_vault_db`) with three object stores:
     - `files`: Read-through local cache of vault notes and assets (`path`, `name`, `content`, `sha`, `lastModified`).
     - `mutations`: Ordered FIFO queue of offline operations (`create`, `update`, `delete`) with optimistic execution.
     - `metadata`: Transient application metadata (e.g. `last_synced_timestamp`).

2. **Read-Through & Offline Fallback**:
   - When online, requests fetch from GitHub through the Supabase Edge Function (`/v1/*`) and asynchronously refresh the local IndexedDB cache.
   - When offline or if network requests fail, the application reads directly from IndexedDB.

3. **Sequential Mutation Queue & Replay**:
   - Edits made offline are applied immediately to the local cache and appended to the `mutations` store.
   - A network reconnect listener (`window.addEventListener('online')`) and manual sync trigger automatically replay pending mutations in order via `POST /v1/files`, `PUT /v1/files/{path}`, or `DELETE /v1/files/{path}`.

4. **3-Way Conflict Diff Resolution**:
   - If a mutation fails with `409 Conflict` (due to SHA mismatch from remote changes), the user is presented with a visual side-by-side diff modal:
     - **Accept Remote**: Discards local draft and updates cache to GitHub HEAD.
     - **Force Overwrite**: Fetches current remote SHA and commits local content over remote.
     - **Save Local as Conflict Copy**: Commits local draft to a separate file (`note.conflict-TIMESTAMP.md`), preserving both versions.

## Consequences

### Positive
- Instantaneous note load times and uninterrupted offline editing.
- Zero data loss during network dropouts or concurrent multi-device editing.
- Strict compliance with `AGENTS.md`: IndexedDB can be completely cleared without loss of canonical vault data.

### Negative
- Local IndexedDB storage must be reconciled with remote deletions.
- Offline mutations with SHA conflicts require explicit user resolution.

## Related Decisions
- ADR-001: GitHub Is the Source of Truth
- ADR-002: Supabase Responsibilities
- ADR-003: API Boundary
- ADR-005: PWA and Swift Shared API
