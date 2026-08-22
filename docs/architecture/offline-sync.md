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
