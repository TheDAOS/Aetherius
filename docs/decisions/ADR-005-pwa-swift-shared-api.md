# ADR-005: PWA and Swift Share the Same API

**Status:** Accepted

## Context

The project is intended to provide both a Progressive Web App and a native iOS application.

Both clients need access to the same user vault.

Maintaining separate backend implementations for each client would introduce duplicated business logic and make behavior inconsistent.

## Decision

The PWA and future Swift/iOS application will use the same backend API.

The architecture is:

```text
             ┌──────────────┐
             │ Common API   │
             └──────┬───────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
        PWA                Swift/iOS
```

The API contract is defined by:

```text
openapi/openapi.yaml
```

The Swift application will implement a native API client against the same contract used by the PWA.

The Swift application will not create a separate backend.

## Consequences

### Positive

* Backend logic is shared.
* Authentication and authorization behavior remain consistent.
* PWA and Swift access the same vault model.
* API changes can be centrally documented.
* Native clients can be developed independently of backend implementation details.

### Negative

* API design must support both web and native clients.
* Backward compatibility becomes increasingly important as clients diverge in release cycles.
* The API must avoid assumptions specific to one client.

## Constraints

Client-specific UI and platform functionality may differ.

The shared boundary is the backend API, not the user interface.

The Swift application may later provide native functionality such as:

* Offline caching.
* Background synchronization.
* Share Sheet integration.
* Files integration.
* Spotlight integration.
* Widgets.
* Native editing.

These features must not require a separate backend architecture.

## Alternatives Considered

### Separate Swift backend

Rejected because it would duplicate backend functionality.

### Swift directly accessing GitHub

Rejected because privileged GitHub operations belong behind the backend API.

## Related Decisions

* ADR-001: GitHub Is the Source of Truth
* ADR-002: Supabase Responsibilities
* ADR-003: API Boundary
