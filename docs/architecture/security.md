# Security Architecture

## Purpose

This document describes the primary security boundaries of the application.

The vault contains personal user data, so security must be considered at every boundary.

---

## Trust Boundaries

The primary boundaries are:

```text
User
 │
 ▼
Client
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
Private Repository
```

The client is not trusted with privileged backend credentials.

---

## Client Security

The PWA and future Swift application must not contain:

* GitHub privileged access tokens.
* Supabase service-role keys.
* Production secrets.
* Backend-only credentials.

Client-side configuration must be treated as public.

---

## Authentication

All protected operations must require appropriate authentication.

The backend must identify the authenticated user before performing protected operations.

---

## Authorization

Authentication alone is insufficient.

The backend must verify that the authenticated user is authorized to access the requested vault or repository.

Do not rely on client-side authorization checks.

Authorization must be enforced server-side.

---

## GitHub Security

GitHub operations must occur through the backend API.

The backend must:

* Validate the authenticated user.
* Validate repository access.
* Perform only authorized operations.
* Avoid exposing privileged credentials.
* Avoid leaking sensitive GitHub information.

---

## Secret Management

Never commit secrets to Git.

This includes:

* API keys.
* Access tokens.
* Private keys.
* Passwords.
* Production credentials.
* Real `.env` secrets.

Development and production credentials must remain separate.

---

## Logging

Logs must not expose:

* Access tokens.
* Passwords.
* Private keys.
* Other credentials.

Avoid logging complete private vault contents unless there is an explicit, justified need.

---

## API Security

API endpoints should enforce:

* Authentication.
* Authorization.
* Input validation.
* Safe path handling.
* Predictable error responses.
* Appropriate rate/resource controls.
* No unnecessary disclosure of internal implementation details.

---

## Repository Security

The user's private repository remains under the user's GitHub ownership and permissions.

The application must not assume access beyond what GitHub authorization permits.

---

## CI Security

GitHub Actions should eventually include security checks such as:

* Secret scanning.
* Dependency/security checks.
* Validation of repository configuration.

CI credentials must use GitHub's supported secret mechanisms rather than committed values.

---

## Security Principle

The core security model is:

```text
Client
  ↓
Authenticated API request
  ↓
Server-side authorization
  ↓
Privileged GitHub operation
  ↓
User-owned private repository
```

Security controls should be enforced by the backend and CI rather than relying solely on AI instructions or client behavior.
