# Data Flow

## Purpose

This document describes how data moves through the application.

The fundamental rule is that vault contents ultimately reside in the user's private GitHub repository.

---

## Read Flow

When a client requests vault information:

```text
PWA / Swift
    │
    ▼
Supabase API
    │
    ▼
Edge Function
    │
    ▼
GitHub API
    │
    ▼
User's Private Repository
    │
    ▼
Edge Function
    │
    ▼
Supabase API
    │
    ▼
PWA / Swift
```

The client does not directly perform privileged repository operations.

---

## Write Flow

When a user creates or modifies a note:

```text
User
 │
 ▼
PWA / Swift
 │
 ▼
Supabase API
 │
 ▼
Edge Function
 │
 ▼
GitHub API
 │
 ▼
User's Private Repository
 │
 ▼
Git Commit
```

The resulting Markdown file and Git history remain in the user's repository.

---

## File Operations

The application will eventually support operations such as:

```text
List files
Read file
Create file
Update file
Delete file
```

These operations are performed against the user's GitHub-backed vault.

---

## Search

The initial search system should operate against the vault contents available through the backend.

Future implementations may introduce indexes or semantic search.

Any such index is derived data.

It must not replace GitHub as the canonical source of truth.

---

## Synchronization

Offline synchronization is a later phase.

The intended architecture is:

```text
GitHub
   ↕
API
   ↕
Sync Engine
   ↕
IndexedDB
   ↕
PWA
```

The Swift application may eventually implement an equivalent native local-cache and synchronization architecture.

Sophisticated conflict resolution is intentionally deferred until basic CRUD functionality is stable.

---

## Future Derived Data

Future systems may generate:

* Search indexes.
* Backlinks.
* Knowledge graphs.
* Embeddings.
* Semantic indexes.
* AI relationships.

These systems consume vault data but do not become authoritative over it.

The canonical relationship remains:

```text
GitHub Markdown
      │
      ├──► Search Index
      ├──► Graph
      ├──► Embeddings
      └──► AI Features
```

GitHub remains the source of truth.
