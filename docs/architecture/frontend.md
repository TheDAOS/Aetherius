# Frontend & PWA Architecture

## Purpose

This document describes the architecture, design system, layout, routing, and data flow for the Aetherius Progressive Web App (PWA) client located in `apps/web/`.

---

## 1. Technical Stack

* **Framework**: React 19 + TypeScript + Vite
* **Routing**: React Router
* **Styling**: Tailwind CSS (Utility-first with custom Neo-Memphis design tokens)
* **Icons**: Lucide React
* **PWA**: `vite-plugin-pwa` (Web App Manifest + Service Worker shell caching)
* **Contract**: Strict adherence to `openapi/openapi.yaml`

---

## 2. Design System: "Warm Cream & Acid Neo-Memphis"

The application uses a single unified signature aesthetic blending tactile Bauhaus poster geometry, warm print newsprint tones, and punchy acid accents.

### Color Palette & Tokens
* **Shell Background (`bg-cream-shell`)**: `#F6F3EA` (Warm tactile cream canvas)
* **Editor Canvas (`bg-paper-canvas`)**: `#FFFFFF` (Clean, distraction-free white sheet)
* **Borders & Inks (`border-ink`, `text-ink-primary`)**: `#111111` (Solid 2px/3px black outlines)
* **Muted Ink (`text-ink-muted`)**: `#66625C` (Metadata, timestamps, subtle breadcrumbs)
* **Acid Accent (`accent-acid`)**: `#E2FF00` (Highlighter yellow-lime: search match highlights, active note tab)
* **Orange Accent (`accent-orange`)**: `#FF5500` (Electric tangerine: uncommitted/dirty state, primary CTAs)
* **Pink Accent (`accent-pink`)**: `#FF1493` (Hot flamingo pink: tags, bookmarks, special labels)
* **Cobalt Accent (`accent-cobalt`)**: `#1848FF` (Electric ultramarine: folder tabs, selection borders, link accents)
* **Mint Accent (`accent-mint`)**: `#00F5D4` (Mint cyan: GitHub sync success, clean commit status)

### Tactile Micro-Interactions & Physics
* **Arcade Press Buttons**:
  * Default state: `box-shadow: 3px 3px 0px #111111;`
  * Hover state: `transform: translate(-1px, -1px); box-shadow: 4px 4px 0px #111111;`
  * Depressed state on click: `transform: translate(2px, 2px); box-shadow: 1px 1px 0px #111111;`
* **Transitions**: Snappy CSS transitions (`transition: all 0.1s cubic-bezier(0.16, 1, 0.3, 1)`).
* **Editor Tranquility**: Zero movement or flashing inside the note writing canvas.

---

## 3. Application Shell & Layout

The desktop workspace follows a 3-column collapsible architecture:

```text
┌─────────────────────────┬─────────────────────────────────────────────────────────────┐
│ ✦ AETHERIUS VAULT       │  [ ⚡ MAIN • CLEAN ]  [ + NEW NOTE ]  [ 🚀 PUSH ]           │
├─────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 🔍 [ Search (Ctrl+K) ]  │  📂 notes / programming / 🟡 react-state.md                │
│                         ├─────────────────────────────────────────────────────────────┤
│ 📁 01_PROJECTS          │  [ ✏️ Edit ]  [ 👁️ Preview ]  [ ◫ Split ]                  │
│   ├── 📄 roadmap.md     ├─────────────────────────────────────────────────────────────┤
│   └── 📄 launch-plan.md │                                                             │
│ 📁 02_DAILY_NOTES       │  # Clean Distraction-Free Note Canvas                       │
│   └── 🟡 2026-08-20.md  │                                                             │
│ 📁 03_RESOURCES         │  Markdown content editing sheet...                          │
│                         │                                                             │
│ ─────────────────────── │                                                             │
│ [ ⚡ 3 Uncommitted ]    │                                                             │
│ [ ⚙️ Vault Settings ]   │                                                             │
└─────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 4. Routes & Navigation Structure

| Route | View Name | Description |
| :--- | :--- | :--- |
| `/` | **Landing / Welcome** | Public landing page with GitHub OAuth CTA and visual intro. |
| `/setup` | **Vault Setup** | Onboarding: clone vault from template or connect existing GitHub repo. |
| `/vault` or `/notes/*` | **Main Workspace** | Primary 3-column editor, file tree navigator, and Git status. |
| `Ctrl+K` Overlay | **Quick Search** | Instant modal search across titles and markdown content. |
| `/settings` | **Settings Modal** | Vault metadata, editor preferences, and PWA install trigger. |
| `/*` | **404 Page** | Fallback for missing notes/routes. |

---

## 5. Mock API & OpenAPI Conformance

During Phase 1, `apps/web/src/services/mockVault.ts` provides client-side repository services matching the OpenAPI specification (`/v1/vault`, `/v1/files`, `/v1/files/{path}`). This allows testing:
- Folder expansion and browsing.
- Note creation, modification, and deletion.
- Dirty vs. clean Git status tracking.
- Local storage persistence across browser refreshes.
