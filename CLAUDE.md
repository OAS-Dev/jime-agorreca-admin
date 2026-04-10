# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # starts on port 3001
pnpm build
pnpm lint
```

No test runner is configured.

## Architecture

**Next.js 14 App Router** with two route groups:

- `src/app/(auth)/` — public routes (login). No layout wrapper.
- `src/app/(dashboard)/` — protected routes. Wraps content in a fixed `<Sidebar />` + flex layout. The sidebar is 256px wide (`ml-64` on the content area).

The root `page.tsx` immediately redirects to `/login`.

**Auth flow** — NextAuth v4 with `CredentialsProvider`:
1. Login POSTs to backend `POST /auth/login` via the axios `api` instance.
2. Only users with `role === 'ADMIN'` are allowed through — others get `null` (rejected).
3. The backend's JWT token is stored as `backendToken` on the NextAuth JWT and surfaced on `session.backendToken`.
4. `src/middleware.ts` uses NextAuth middleware to protect every route except `/login`, `/api/auth/*`, and Next.js internals.

**Backend API client** — `src/lib/api.ts` exports an axios instance pointing to `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). It has no auth interceptor; attach `session.backendToken` manually when calling authenticated endpoints.

**Auth types** — `src/types/next-auth.d.ts` extends the Session and JWT interfaces. When accessing `session.user.id`, `session.user.role`, or `session.backendToken`, TypeScript knows about them because of this file.

## Design System — Kinetic Editorial

Custom Tailwind color tokens (defined in `tailwind.config.ts`) mirror the public frontend's design system:

- **Surfaces**: `surface-bright`, `surface-container-lowest` through `surface-container-highest`
- **Text**: `on-surface`, `on-surface-variant`
- **Brand pink**: `primary-container` (`#ff709c`), `on-primary-container`
- **Brand yellow**: `secondary-container` / `secondary-fixed` (`#f8e53e`)
- **Borders**: `outline`, `outline-variant`
- **Shadows**: `shadow-kinetic`, `shadow-kinetic-primary`

Fonts loaded via `next/font/google`:
- `--font-headline` → Plus Jakarta Sans (`font-headline` in Tailwind)
- `--font-body` → Manrope (`font-body` in Tailwind)

UI primitives in `src/components/ui/` follow the shadcn pattern (Radix UI + `class-variance-authority` + `tailwind-merge`). Admin-specific components live in `src/components/admin/`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:4000`) |
| `NEXTAUTH_SECRET` | Required for NextAuth JWT signing |
| `NEXTAUTH_URL` | Required for NextAuth redirects (e.g. `http://localhost:3001`) |
