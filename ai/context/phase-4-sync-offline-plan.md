# Phase 4 Implementation Plan — Offline Cache & Synchronization Engine

## 1. Overview & Objectives

Phase 4 delivers offline capability and synchronization for the Aetherius PWA while preserving the core architectural principles:
- **GitHub is the canonical source of truth** (AGENTS.md Rule #1 & ADR-001).
- **IndexedDB is strictly derived state and an offline mutation buffer.** Note content is never permanently trapped in browser storage.
- **PWA and future Swift app adhere to the same OpenAPI contract** (ADR-005).

## 2. Architecture & Data Flow

```text
               ┌──────────────────────────────┐
               │         PWA Frontend         │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼──────────────┐
               │    IndexedDB Local Cache    │
               │  - Cached Files (Derived)   │
               │  - Pending Mutation Queue   │
               └──────────────┬───────────────┘
                              │  (When online / sync)
               ┌──────────────▼──────────────┐
               │   Supabase API (api-v1)     │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼──────────────┐
               │         GitHub API          │
               │   (Canonical Vault Repo)    │
               └─────────────────────────────┘
```

## 3. Step-by-Step Execution Sequence

### **Step 1 — IndexedDB Storage Layer**
- Implement a lightweight, zero-dependency native IndexedDB storage module (`apps/web/src/services/storage/offlineDb.ts`).
- Define stores:
  - `files`: `{ path, name, type, content, sha, size, lastModified, isCached }`
  - `mutations`: `{ id, action: 'create' | 'update' | 'delete', path, content?, expectedSha?, timestamp }`
  - `metadata`: `{ key, value }` (vault metadata, last sync timestamp)

### **Step 2 — Read-Through Caching & Offline Fallback**
- Update `VaultService` / `useVault`:
  - **Online**: Fetch file tree and notes from backend API, update IndexedDB cache in the background.
  - **Offline**: Serve directly from IndexedDB if network request fails or `navigator.onLine === false`.
  - Immediate optimistic responsiveness for note opening and switching.

### **Step 3 — Offline Mutation Queue & Background Sync**
- When editing, creating, or deleting notes while offline:
  - Save changes optimistically to local IndexedDB cache with `isDirty: true`.
  - Append mutation to the `mutations` queue.
- Listen for `online` network events and sync triggers:
  - Replay pending mutations sequentially through `VaultService`.
  - Handle SHA updates and conflict resolution gracefully.
  - Clear processed items from mutation queue.

### **Step 4 — Sync API Endpoints in Edge Functions**
- Implement `GET /v1/sync/status` in `supabase/functions/api-v1/index.ts` to return sync state and repository latest commit info.
- Implement `POST /v1/sync` endpoint matching `openapi.yaml`.

### **Step 5 — Asset Upload Support**
- Add image attachment upload in `NoteToolbar.tsx` / `apps/web/src/components/editor/`:
  - Allow inserting images into notes.
  - Upload/commit image assets to `assets/images/{filename}` via the Files API.

### **Step 6 — Verification & Quality Checks**
- Verify offline operation by simulating offline network mode in DevTools.
- Verify sync replay when coming back online.
- Pass `tsc -b && vite build`.
- Validate OpenAPI with `redocly lint openapi/openapi.yaml`.
- Update Graphify knowledge graph (`graphify update .`).

## 4. Definition of Done
Phase 4 is complete when a user can seamlessly view, create, and edit notes while completely offline, with all changes automatically syncing and committing to their private GitHub repository upon regaining connectivity.
