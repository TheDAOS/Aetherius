# Authentication Architecture

## Purpose

This document describes the authentication model between users, clients, Supabase, and GitHub.

---

## Authentication Provider

The application uses GitHub-based authentication through Supabase.

The intended flow is:

```text
User
 │
 ▼
PWA / Swift
 │
 ▼
Supabase Auth
 │
 ▼
GitHub Authentication
 │
 ▼
Authenticated Application Session
```

Supabase manages the application authentication/session layer.

---

## Client Authentication

The client receives an authenticated application session.

The client must not be given privileged backend credentials.

The PWA and future Swift application interact with the backend using the application's authenticated API session.

---

## GitHub Authorization

The application requires appropriate authorization to operate on the user's vault repository.

Repository operations are performed through the backend.

```text
Client
  │
  │ authenticated request
  ▼
Supabase Edge Function
  │
  │ authorized GitHub operation
  ▼
GitHub API
```

The backend must verify that the authenticated user is authorized to perform the requested operation.

---

## Authorization

Authentication answers:

> Who is the user?

Authorization answers:

> Is this user allowed to access or modify this vault?

Both must be enforced.

The backend must not assume that knowledge of a repository owner or repository name grants access.

---

## Credential Rules

The following must never be exposed to clients:

* GitHub privileged credentials.
* Supabase service-role credentials.
* Production secrets.
* Backend-only credentials.

Secrets must not be committed to Git.

Development and production credentials must remain separate.

---

## Future Native Client

The Swift application will use the same authentication and API architecture.

It must not establish an independent backend authentication system.

Platform-specific authentication UX may differ, but the backend security boundary remains shared.
