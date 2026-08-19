# ADR-006: Frontend PWA Design System and Architecture

**Status:** Accepted

## Context

Phase 1 of Aetherius requires establishing the foundation for the Progressive Web App (PWA) client. 

Personal knowledge management tools often suffer from either being visually generic (plain gray/slate minimal themes) or overly complex and distracting. Furthermore, before backend (Supabase) and Git repository integration (Phase 2 & 3), the frontend client must be fully buildable, testable, and navigable.

## Decision

1. **Design Theme**: Aetherius adopts a single unified signature **"Warm Cream & Acid Neo-Memphis"** aesthetic.
   - Shell background: Warm tactile cream/newsprint (`#F6F3EA`) with crisp 2px/3px black outlines (`#111111`) and hard offset drop-shadows (`3px 3px 0 #111111`).
   - Accent highlights: Acid Lime (`#E2FF00`), Electric Tangerine (`#FF5500`), Hot Pink (`#FF1493`), and Mint (`#00F5D4`).
   - Single theme: We avoid redundant light/dark toggle complexity in favor of an unmistakable, cohesive visual identity.

2. **Editor Canvas Tranquility**:
   - The writing canvas remains clean, pure white (`#FFFFFF`), distraction-free, and motion-free to ensure focus during long-form reading and writing.

3. **Tactile Mechanical Physics**:
   - Micro-interactions use snappy mechanical button depression physics (`100ms` arcade press effect) implemented via lightweight CSS transitions without heavy external animation dependencies.

4. **Mock-First OpenAPI Conformance**:
   - The frontend integrates against a client-side mock repository implementing the exact schemas defined in `openapi/openapi.yaml`.

## Consequences

### Positive
* Strong, distinctive, memorable visual brand.
* Writing space remains peaceful and clean despite high-energy surrounding shell.
* Snappy performance and low bundle size by avoiding heavy animation libraries.
* Frontend can be fully developed and tested independently of backend setup.
* OpenAPI contract adherence is maintained from day one.

### Negative
* High-contrast aesthetic may not appeal to users who prefer standard monotone gray interfaces.
* Single-theme design requires careful contrast checking to ensure readability across all elements.

## Related Decisions
* ADR-001: GitHub Is the Source of Truth
* ADR-003: API Boundary
* ADR-004: Markdown Is the Canonical Note Format
* ADR-005: PWA and Swift Share the Same API
