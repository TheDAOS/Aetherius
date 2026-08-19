# Phase 1 Implementation Plan — Frontend / PWA Foundation

## 1. Overview & Objectives

**Phase 1** focuses on building the frontend foundation for **Aetherius** inside `apps/web/`. 
The application is a Progressive Web App (PWA) built with **React 19, TypeScript, Vite, and Tailwind CSS**, featuring a signature **Warm Cream & Acid Neo-Memphis** design system, snappy mechanical micro-interactions, and a clean, distraction-free writing canvas.

All client data interactions in Phase 1 use an in-memory mock API layer strictly adhering to `openapi/openapi.yaml`.

---

## 2. Design System: "Warm Cream & Acid Neo-Memphis"

### 2.1 Color Palette & Tokens
* **Shell Background (`bg-cream-shell`)**: `#F6F3EA` (Warm tactile newsprint / cream)
* **Editor Canvas (`bg-paper-canvas`)**: `#FFFFFF` (Distraction-free pure paper sheet)
* **Outlines / Inks (`border-ink`, `text-ink-primary`)**: `#111111` (Solid 2px / 3px borders and deep charcoal text)
* **Muted Text (`text-ink-muted`)**: `#66625C` (Timestamps, secondary metadata)
* **Accent Acid (`accent-acid`)**: `#E2FF00` (Highlighter yellow-lime: search matches, active file badge)
* **Accent Orange (`accent-orange`)**: `#FF5500` (Electric tangerine: uncommitted/dirty notes, primary CTA)
* **Accent Pink (`accent-pink`)**: `#FF1493` (Hot flamingo pink: tags, bookmarks, special labels)
* **Accent Cobalt (`accent-cobalt`)**: `#1848FF` (Electric ultramarine: folder tabs, selection borders, link accents)
* **Accent Mint (`accent-mint`)**: `#00F5D4` (Mint cyan: GitHub sync success, clean status)

### 2.2 Tactile Mechanical Physics & Shadows
* **Default Card / Button Shadow**: `box-shadow: 3px 3px 0px #111111;`
* **Hover Lift**: `transform: translate(-1px, -1px); box-shadow: 4px 4px 0px #111111;`
* **Active Press (Depressed)**: `transform: translate(2px, 2px); box-shadow: 1px 1px 0px #111111;`
* **Transitions**: Crisp, snappy CSS `transition: all 0.1s cubic-bezier(0.16, 1, 0.3, 1)` (no heavy animation libraries).

### 2.3 Typography Hierarchy
* **Headings / Logo**: *Space Grotesk* / *Cabinet Grotesk* (Bold 700 / Black 900)
* **Body / UI Labels**: *Plus Jakarta Sans* / *Inter* (Regular 400, Medium 500, SemiBold 600)
* **Code / Frontmatter / SHA Badges**: *Space Mono* / *JetBrains Mono* (Regular 400)

---

## 3. Application Layout & Views

### 3.1 Key Views & Routes

| Route | Page / View Name | Purpose & Key UI Elements |
| :--- | :--- | :--- |
| `/` (Unauthenticated) | **Landing / Welcome Page** | • Introduction to Aetherius (User-owned, Git-backed vault)<br>• Tactile **[ ⚡ Sign in with GitHub ]** CTA<br>• Visual preview cards with Acid Neo-Memphis aesthetic |
| `/setup` | **Vault Setup & Onboarding** | • Option A: **"Create from Template"** (clones default vault structure with starter notes)<br>• Option B: **"Connect Existing GitHub Repo"** |
| `/vault` or `/notes/*` | **Main Workspace (Core View)** | • **Primary Daily Driver**<br>• Left sidebar: Recursive folder tree (`notes/`, `templates/`, `assets/`), search, stats<br>• Top bar: Git status badge (`[ ⚡ MAIN • CLEAN ]`), `[ + New Note ]`, `[ 🚀 Push ]`<br>• Main canvas: Note title, tags, breadcrumbs, clean white sheet, Edit / Preview / Split modes |
| `Ctrl+K` / Overlay | **Quick Search & Switcher** | • Instant modal to jump between notes or search content<br>• Acid-lime highlight over matching search keywords<br>• Arrow-key keyboard navigation |
| `/settings` | **Vault & App Settings** | • **Vault Info**: Linked GitHub repo, current branch (`main`), last commit SHA<br>• **Editor Preferences**: Font size, line length, monospace toggle<br>• **PWA Status**: Offline cache indicator, "Install App" button |
| `/*` (Fallback) | **404 Not Found Page** | • Funky Neo-Memphis graphic: *"Note vanished into the ether"*<br>• Quick button to create this note or return to root |

### 3.2 Responsive Adaptations for Mobile PWA
* On **Desktop / Tablet**: Sidebar + Editor live side-by-side in the 3-column workspace.
* On **Mobile Screens**:
  * Workspace defaults to the **Note Reader/Editor**.
  * File tree is accessed via a **slide-out drawer** (hamburger menu).
  * Floating **[ + ] button (FAB)** in the bottom right enables rapid note creation.

---

## 4. Frontend Monorepo Directory Structure (`apps/web/`)

```text
apps/web/
├── public/
│   ├── favicon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── robots.txt
├── src/
│   ├── assets/
│   │   └── icons/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.tsx            # Neo-Memphis sticker / pill badge
│   │   │   ├── Button.tsx           # Tactile 3D arcade press button
│   │   │   ├── Input.tsx            # Styled search and title inputs
│   │   │   └── Modal.tsx            # Dialog frame with hard shadow
│   │   ├── editor/
│   │   │   ├── NoteEditor.tsx       # Clean text editing area
│   │   │   ├── NotePreview.tsx      # Rendered Markdown view
│   │   │   └── NoteToolbar.tsx      # View modes (Edit/Preview/Split), SHA info
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Responsive 3-pane shell
│   │   │   ├── Sidebar.tsx          # Collapsible tree sidebar
│   │   │   └── TopHeader.tsx        # Top navigation & Git status
│   │   └── vault/
│   │       ├── FileItem.tsx         # Note item in sidebar with hover physics
│   │       ├── FileTree.tsx         # Recursive folder hierarchy
│   │       └── GitStatusBadge.tsx   # Tactile Git status indicator
│   ├── hooks/
│   │   ├── usePWA.ts                # PWA install prompt & offline status
│   │   └── useVault.ts              # Note selection, creation, and editing
│   ├── routes/
│   │   ├── SettingsModal.tsx        # Vault settings overlay
│   │   ├── SetupView.tsx            # Initial template setup flow
│   │   └── WorkspaceView.tsx        # Main workspace
│   ├── services/
│   │   ├── api.ts                   # Base API types matching openapi.yaml
│   │   └── mockVault.ts             # In-memory mock vault & files repository
│   ├── styles/
│   │   └── globals.css              # Neo-Memphis utilities, borders, shadows
│   ├── types/
│   │   └── vault.ts                 # TypeScript types (Vault, NoteFile, CommitStatus)
│   ├── App.tsx                      # Root routes
│   └── main.tsx                     # Entry point
├── index.html
├── package.json                     # Vite, React 19, React Router, Tailwind, Lucide
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts                   # Vite + Tailwind + VitePWA plugin
```

---

## 5. Mock API & Data Layer (Conforming to `openapi.yaml`)

The `mockVault.ts` service implements the exact shapes defined in `openapi/openapi.yaml`:
* `GET /v1/vault`: Returns vault metadata.
* `GET /v1/files`: Returns hierarchical list of vault files (`notes/`, `templates/`, `assets/`, `README.md`).
* `GET /v1/files/{path}`: Returns file content, encoding, and SHA.
* `PUT /v1/files/{path}`: Updates file content and produces a mock commit SHA.
* `POST /v1/files`: Creates new note.
* `DELETE /v1/files/{path}`: Deletes note.

---

## 6. Step-by-Step Execution Sequence

1. **Step 1 — Workspace & Project Scaffolding**: Setup Vite, React 19, TypeScript, and Tailwind CSS.
2. **Step 2 — Design System & Primitives**: Build button, badge, input, and modal components with arcade press mechanics.
3. **Step 3 — Mock Data Layer & Hooks**: Build `mockVault.ts` and `useVault.ts`.
4. **Step 4 — App Shell & Navigation**: Build TopHeader, Sidebar, FileTree, and GitStatusBadge.
5. **Step 5 — Note Canvas & Markdown Views**: Build NoteEditor, NotePreview, and NoteToolbar.
6. **Step 6 — PWA & Responsive Refinement**: Configure `vite-plugin-pwa` and mobile drawer.
7. **Step 7 — Verification & Quality Checks**: Typecheck, build, and manual flow validation.
