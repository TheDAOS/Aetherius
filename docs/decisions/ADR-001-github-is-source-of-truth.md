# ADR-001: GitHub Is the Source of Truth

**Status:** Accepted

## Context

The application provides an interface for managing a user's personal Markdown knowledge vault.

The user's vault should remain portable, user-owned, and accessible independently of the application.

The application is an interface and API layer around the user's repository rather than the owner of the user's notes.

## Decision

The user's private GitHub repository is the canonical source of truth for vault contents.

Markdown files and other vault files stored in the repository are canonical.

GitHub provides:

* Repository storage.
* Git history.
* Version history.
* File ownership.
* Repository portability.

Supabase must not become the canonical storage layer for user notes.

Application caches, indexes, or derived metadata may exist, but they must never silently become the source of truth.

All privileged GitHub operations are performed through the backend API.

## Consequences

### Positive

* Users retain ownership of their data.
* Vault contents remain portable.
* Git provides version history.
* Users can access their files directly through GitHub.
* The application does not require a proprietary storage format.
* Other clients can consume the same repository.

### Negative

* The application must handle GitHub API behavior.
* GitHub availability affects vault operations.
* Synchronization and conflict handling become important as offline functionality is introduced.
* Repository operations may have API limits.

## Alternatives Considered

### Supabase as the primary note database

Rejected.

This would make the application database the canonical owner of user data and weaken the portability and Git-backed architecture.

### Application-owned storage

Rejected.

The project explicitly prioritizes user ownership and open formats.

## Related Decisions

* ADR-002: Supabase Responsibilities
* ADR-003: API Boundary
* ADR-004: Markdown Vault Format
* ADR-005: PWA and Swift Shared API
