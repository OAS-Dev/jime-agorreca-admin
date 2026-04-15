# CLAUDE.md — jime-agorreca-admin

## Commands

```bash
pnpm dev        # Start on port 3001
pnpm build
pnpm lint
```

No test runner configured.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:4000`) |
| `NEXTAUTH_SECRET` | Required for NextAuth JWT signing |
| `NEXTAUTH_URL` | Required for NextAuth redirects (e.g. `http://localhost:3001`) |

> Backend CORS must include port 3001. In backend `.env`: `FRONTEND_URL="http://localhost:3000,http://localhost:3001"`

## Architecture

**Next.js 14 App Router** with two route groups:

```
src/app/
  (auth)/       # Public: login page. No layout wrapper.
  (dashboard)/  # Protected: all CMS routes. Wraps content in fixed Sidebar + flex layout.
```

Root `page.tsx` redirects immediately to `/login`.

### Auth flow
NextAuth v4 with `CredentialsProvider`:
1. Login POSTs to backend `POST /auth/login` via axios `api` instance
2. Only users with `role === 'ADMIN'` are allowed — others get `null` (rejected)
3. Backend JWT stored as `backendToken` on NextAuth JWT → surfaced as `session.backendToken`
4. `src/middleware.ts` protects every route except `/login`, `/api/auth/*`, and Next.js internals

### Backend API client
`src/lib/api.ts` — axios instance pointing to `NEXT_PUBLIC_API_URL`. No auth interceptor. Attach `session.backendToken` manually when calling authenticated endpoints:
```ts
headers: { Authorization: `Bearer ${session.backendToken}` }
```

### Auth types
`src/types/next-auth.d.ts` extends Session and JWT interfaces. `session.user.id`, `session.user.role`, and `session.backendToken` are fully typed here.

## Page / Route Structure

### Auth (`(auth)/`)
| Route | Description |
|---|---|
| `/login` | Admin login — rejects non-ADMIN users |

### Dashboard (`(dashboard)/`)
Sidebar-driven layout (256px wide, `ml-64` on content area).

| Route | Description |
|---|---|
| `/dashboard` | Main dashboard — bento grid 12 cols, key metrics |
| `/usuarios` | Users index (redirect or overview) |
| `/usuarios/suscriptores` | Subscriber list with membership data (plan, status, expiry, gateway). Metrics: total / active / pending / inactive. Filters by status + search. Badge "Vence pronto" for subscriptions expiring in < 7 days. |
| `/usuarios/equipo` | Editorial team — admin list + "Agregar Admin" modal |
| `/blog` | Blog post list with filters, metrics, delete dialog |
| `/blog/nuevo` | Create post — PostForm with metadata sidebar |
| `/blog/[id]` | Edit post — same PostForm, pre-populated |

### Create admin flow (`/usuarios/equipo`)
Two-step process against the backend:
1. `POST /auth/register` (public, no token) → creates USER
2. `PATCH /users/:id/role` (Bearer admin token, `{ role: 'ADMIN' }`) → promotes to ADMIN

## Design System — Kinetic Editorial

Custom Tailwind color tokens (mirrors public frontend):

| Token | Usage |
|---|---|
| `surface-bright`, `surface-container-*` | Surface layers (tonal) |
| `on-surface`, `on-surface-variant` | Text colors |
| `primary-container` (`#ff709c`) | Brand pink — buttons, badges |
| `secondary-container` / `secondary-fixed` (`#f8e53e`) | Brand yellow — accents |
| `outline`, `outline-variant` | Borders |
| `shadow-kinetic`, `shadow-kinetic-primary` | Shadows |

**Rules**: No `border` 1px lines — use tonal layering instead. No arbitrary colors — use design tokens only.

Fonts via `next/font/google`:
- `--font-headline` → Plus Jakarta Sans (`font-headline` in Tailwind)
- `--font-body` → Manrope (`font-body` in Tailwind)

UI primitives in `src/components/ui/` follow shadcn pattern (Radix UI + `class-variance-authority` + `tailwind-merge`).
Admin-specific components in `src/components/admin/` (Sidebar, PostForm, etc.).

### shadcn components installed
- `textarea`, `select` (Radix), `switch` (Radix), standard Button/Input/Form/Dialog/Badge/Table
