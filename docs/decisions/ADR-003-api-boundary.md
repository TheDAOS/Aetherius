# ADR-003: API Boundary

**Status:** Accepted

## Context

The project will have multiple clients.

The initial client is a Progressive Web App, while a native Swift/iOS client is planned for a later phase.

Both clients need access to the same GitHub-backed vault without containing privileged GitHub integration logic.

Direct client-to-GitHub operations would expose implementation details and create security concerns.

## Decision

The application will expose a common versioned backend API.

The intended flow is:

```text
Client
  ↓
Supabase API / Edge Function
  ↓
GitHub API
  ↓
User's private repository
```

The API will initially use the `/v1/` namespace.

Conceptual endpoints include:

```text
GET    /v1/vault
GET    /v1/files
GET    /v1/files/{path}
POST   /v1/files
PUT    /v1/files/{path}
DELETE /v1/files/{path}
GET    /v1/search?q=
POST   /v1/sync
GET    /v1/sync/status
```

The exact API contract will be defined in:

```text
openapi/openapi.yaml
```

OpenAPI is the canonical contract for client/backend communication.

## Consequences

### Positive

* Clients remain independent of GitHub implementation details.
* GitHub credentials can remain behind the backend.
* PWA and Swift can share the same API.
* API behavior can be tested independently.
* OpenAPI provides a machine-readable contract.

### Negative

* The backend becomes an additional layer between clients and GitHub.
* API design must be maintained carefully.
* Changes to the contract can affect multiple clients.

## Rules

Any API change must update the OpenAPI specification.

API behavior must include appropriate authentication, authorization, validation, and error handling.

The clients must not receive privileged GitHub credentials.

## Alternatives Considered

### Direct PWA → GitHub API

Rejected because privileged GitHub operations should remain behind the backend.

### Separate API for each client

Rejected because it would duplicate backend behavior and make the clients architecturally inconsistent.

## Related Decisions

* ADR-001: GitHub Is the Source of Truth
* ADR-002: Supabase Responsibilities
* ADR-005: PWA and Swift Shared API
