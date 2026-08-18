# ADR-002: Supabase Responsibilities

**Status:** Accepted

## Context

The application requires authentication, application metadata, and a backend API layer between clients and GitHub.

The project should avoid maintaining a traditional backend server while remaining within the initial zero-cost development goal.

Supabase provides authentication, Postgres, and Edge Functions that fit these requirements.

## Decision

Supabase is responsible for application infrastructure and metadata.

Its responsibilities include:

* GitHub-based authentication.
* User/session management.
* Vault metadata.
* Application metadata.
* Supabase Postgres.
* Supabase Edge Functions.
* Backend API functionality.

Example application metadata may include:

```text
vaults
------
id
user_id
github_owner
github_repo
branch
created_at
```

Supabase is **not** the canonical storage system for Markdown notes.

Canonical vault contents remain in the user's private GitHub repository.

## Consequences

### Positive

* No dedicated backend server is required initially.
* Authentication and database infrastructure are provided by one platform.
* Edge Functions provide the API boundary.
* The project can remain within free-tier infrastructure during initial development.
* Application metadata can be stored separately from user-owned vault contents.

### Negative

* The backend architecture depends on Supabase services.
* Edge Function limitations must be considered.
* The project must maintain a clear distinction between metadata and canonical vault data.

## Constraints

Supabase must not become a hidden secondary source of truth for notes.

Any system that caches, indexes, or derives information from vault contents must treat GitHub as authoritative.

## Alternatives Considered

### Traditional backend server

Rejected for the initial architecture because it introduces additional infrastructure and operational complexity.

### Supabase as canonical note storage

Rejected because GitHub is the project's source of truth.

## Related Decisions

* ADR-001: GitHub Is the Source of Truth
* ADR-003: API Boundary
* ADR-005: PWA and Swift Shared API
