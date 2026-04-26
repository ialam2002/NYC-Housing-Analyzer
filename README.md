# RentWise NYC - Housing Intelligence Platform

RentWise NYC helps renters evaluate NYC apartments using transit, complaints, violations, amenities, and a weighted RentWise Score.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- NextAuth
- Zod
- Mapbox GL JS + Recharts

## Architecture Decision

The MVP uses a **modular monolith** in Next.js:

- UI routes and API route handlers ship together for faster delivery.
- Domain logic is isolated in `src/server/*` service/repository layers.
- Prisma is the single typed data access layer.
- NextAuth handles session lifecycle and protected user actions like favorites.

See `docs/architecture.md` for the routing and folder plan.

## Exact Initialization Commands (PowerShell)

```powershell
Set-Location "C:\Users\Iftekhar Alam\PycharmProjects\NYC-Housing-Analyzer"
npx create-next-app@latest rentwise-nyc --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
Set-Location ".\rentwise-nyc"
npm install @prisma/client@6.16.2 prisma@6.16.2 next-auth @auth/prisma-adapter zod mapbox-gl react-map-gl recharts class-variance-authority clsx tailwind-merge lucide-react
npm install -D tsx supertest @types/supertest
npx shadcn@latest init -d
npx prisma init --datasource-provider postgresql
```

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill in real credentials.
3. Generate Prisma client and run migrations.
4. Seed mock data.

```powershell
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Current Foundation Delivered

- Production-oriented Prisma schema for auth, properties, complaints, violations, transit, amenities, scoring, favorites.
- Mock seed script in `prisma/seed.ts`.
- Env template in `.env.example`.
- Typed env and Prisma singleton in `src/lib/env.ts` and `src/lib/prisma.ts`.
- Working APIs for `/api/search`, `/api/property/[id]`, `/api/score/[id]`, and `/api/favorites`.

## Favorites API (NextAuth)

Favorites now use NextAuth sessions. In a signed-out state, `/api/favorites` returns `401`.

Sign in via:

- `/api/auth/signin`
- `/api/auth/signout`

For GitHub OAuth, set `GITHUB_ID` and `GITHUB_SECRET` in `.env`.

```powershell
curl "http://localhost:3000/api/favorites"
curl -X POST -H "Content-Type: application/json" -d '{"propertyId":"<PROPERTY_ID>"}' "http://localhost:3000/api/favorites"
curl -X DELETE "http://localhost:3000/api/favorites?propertyId=<PROPERTY_ID>"
```

## Next Build Order

1. API routes (`/api/search`, `/api/property/[id]`, `/api/score/[id]`, `/api/favorites`)
2. Service layer and score engine
3. Homepage, search results, and property dashboard UI
4. Loading/empty states + tests + performance and SEO hardening
