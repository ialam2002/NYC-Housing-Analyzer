# RentWise NYC Architecture (MVP)

## Architecture Decision

Use a **modular monolith** with Next.js App Router:

- **Frontend + backend in one deployable unit** for fast iteration and low ops overhead.
- **Route Handlers for APIs** under `src/app/api/*` with a service layer in `src/server/*`.
- **PostgreSQL + Prisma** as the single source of truth.
- **NextAuth + Prisma Adapter** for authentication and session persistence.
- **Zod schemas** at API boundaries for runtime safety.

This keeps MVP velocity high while preserving clean boundaries so parts can be extracted into separate services later.

## Initial Routing Plan

- `/` - Home search experience
- `/search` - Search results by address/neighborhood
- `/property/[id]` - Property intelligence dashboard
- `/favorites` - Saved properties

API route handlers:

- `/api/search`
- `/api/property/[id]`
- `/api/score/[id]`
- `/api/favorites`

## Folder Structure (Foundation)

```text
src/
  app/
    (marketing)/
      page.tsx
    (app)/
      search/page.tsx
      property/[id]/page.tsx
      favorites/page.tsx
    api/
      search/route.ts
      property/[id]/route.ts
      score/[id]/route.ts
      favorites/route.ts
    layout.tsx
    globals.css
  components/
    ui/
    common/
    feature/
  lib/
    env.ts
    prisma.ts
    utils.ts
  server/
    services/
    repositories/
    scoring/
    validators/
  types/
prisma/
  schema.prisma
  seed.ts
```

