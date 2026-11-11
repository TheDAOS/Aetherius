# Offline Caching & Synchronization Architecture

## Overview
Aetherius provides full offline functionality with optimistic UI updates. All client changes are buffered in local storage and replayed against GitHub via Supabase Edge Functions when connectivity is available.

## Storage Layer (`offlineDb.ts`)
The client leverages native browser IndexedDB (`aetherius_vault_db`):
- **`files` Store**: Keyed by POSIX `path`. Contains cached file records (`path`, `name`, `content`, `sha`, `lastModified`).
- **`mutations` Store**: Keyed by auto-incrementing `id`. Stores sequential mutation records:
  ```typescript
  interface OfflineMutation {
    id?: number;
    action: 'create' | 'update' | 'delete';
    path: string;
    content?: string;
    expectedSha?: string;
    commitMessage?: string;
    timestamp: number;
  }
  ```
- **`metadata` Store**: Keyed by `key`. Stores transient sync markers and timestamps.

## Mutation Lifecycle

```text
User Edits Note
      │
      ▼
1. Apply to React State & IndexedDB 'files' Cache (Instant UI)
      │
      ▼
2. Enqueue in IndexedDB 'mutations' Store
      │
      ├── [Online] ───► 3. Send API Request (/v1/files/...)
      │                        │
      │                        ├─► 200 OK: Remove from 'mutations' queue
      │                        └─► 409 Conflict: Trigger 3-Way Diff Modal
      │
      └── [Offline] ──► Wait for 'online' event ──► Replay Queue in Order
```

## Conflict Resolution
When a remote modification creates a SHA mismatch (`409 Conflict`), the `ConflictModal` provides 3 options:
1. **Accept Remote**: Replaces local file with the latest version from GitHub.
2. **Force Overwrite**: Updates GitHub HEAD with local content using current remote SHA.
3. **Save as Conflict Copy**: Creates `note.conflict-<timestamp>.md` to retain both branches.

## Remote validation API

The browser owns the durable mutation queue. `POST /v1/sync` validates that the
configured GitHub branch/tree is reachable after the client has replayed its
queue; its completed status describes this remote check, not browser mutations.
`GET /v1/sync/status` performs the same check and timestamps the successful check.
Neither endpoint can inspect another device's IndexedDB. GitHub errors propagate
as failures, never as successful synchronization or empty search/list results.
Truncated tree listings fail explicitly to prevent cache replacement with a
partial vault. GitHub search is paginated, and incomplete/over-limit queries ask
the caller to narrow the query.


## 2026-11 repair invariants

File listing reconciliation is an IndexedDB transaction over files and pending operations. It preserves unchanged bodies, invalidates changed remote bodies, deletes obsolete remote entries and retains local creates/updates/deletions as an overlay. Draft writes and their coalesced queue entries commit together. Create→update coalesces to create, update→update keeps the original base SHA and latest body, and create→delete cancels locally.

The client serializes mutations, sync, resolution and branch transitions; Web Locks extend that boundary across same-origin tabs where supported. Operations pin their authenticated account and reject late results after account/branch changes. Cache writes inspect pending operations atomically. Only transport failures become queued offline successes; HTTP auth/permission/validation/conflict errors remain visible.

Saved offline drafts survive sign-out in their original user's database. Editor-only unsaved changes require confirmation. Switching accounts cannot direct an old operation's result into the next user's database. Successful queue replay acknowledges identical remote content after a lost response, but never overwrites a divergent remote note without a conflict action.

Conflict resolution awaits the API, reports errors and preserves further typing. File loads/saves carry selection/edit guards. The editor is read-only until the selected file loads and during a branch transition. Metadata refreshes do not discard dirty content. Sync state separates pending local changes, in-progress replay, failures and verified remote access.

## Cross-device branch guard

Clients attach the branch used to produce a mutation as `expectedBranch` in
create/update/delete/move/sync bodies. File/list/search/status reads pass it as a
query parameter. A different selected branch returns `409 BRANCH_CHANGED` before
GitHub access. This prevents an offline draft from being written onto a branch
selected later on another device, even when both branches share the same blob
SHA. Pending mutations retain their original branch for recovery; changing the
selected branch never retargets queued edits automatically.
