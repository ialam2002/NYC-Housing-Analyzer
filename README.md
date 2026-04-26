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

## Testing and CI

Run the local verification suite:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

CI is configured in `.github/workflows/ci.yml` and runs the same checks on push/PR.

## NYC 311 Data Ingestion (Initial Connector)

An initial production-style ingestion pipeline for 311 complaints is available at `src/server/ingestion/nyc311/complaints.ts` with CLI entrypoint `scripts/ingest-311.ts`.

Configure these variables (optional values shown in `.env.example`):

- `NYC_OPEN_DATA_APP_TOKEN`
- `NYC_311_ENDPOINT`
- `NYC_311_LIMIT`
- `NYC_311_DAYS_BACK`

Run ingestion:

```powershell
npm run ingest:311
```

The script fetches recent NYC 311 records, maps complaints to RentWise categories, links each record to the best matching property (address first, then geo radius fallback), and upserts into `Complaint` with `source=NYC_OPEN_DATA`.

## HPD Violations Data Ingestion (Initial Connector)

An initial HPD violations connector is available at `src/server/ingestion/hpd/violations.ts` with CLI entrypoint `scripts/ingest-hpd-violations.ts`.

Configure these variables (optional values shown in `.env.example`):

- `HPD_VIOLATIONS_ENDPOINT`
- `HPD_VIOLATIONS_LIMIT`
- `HPD_VIOLATIONS_DAYS_BACK`

Run ingestion:

```powershell
npm run ingest:hpd
```

The script fetches recent HPD housing maintenance violations, normalizes class/severity and open-vs-closed status, links each record to the best matching property, upserts into `BuildingViolation` with `source=HPD`, and recalculates scores for affected properties.

## DOB Violations / Complaints Ingestion (Initial Connector)

An initial DOB building issues connector is available at `src/server/ingestion/dob/violations.ts` with CLI entrypoint `scripts/ingest-dob-violations.ts`.

Configure these variables (optional values shown in `.env.example`):

- `DOB_VIOLATIONS_ENDPOINT`
- `DOB_VIOLATIONS_LIMIT`
- `DOB_VIOLATIONS_DAYS_BACK`
- `DOB_VIOLATIONS_DATE_FIELD`

Run ingestion:

```powershell
npm run ingest:dob
```

The connector fetches recent DOB building issues, normalizes status and severity, matches each row to the best property, upserts into `BuildingViolation` with `agency="DOB"` and `source=DOB`, and recalculates scores for affected properties. The default dataset/date-field mapping is an initial adapter and may need a small field-tuning pass when pointed at your chosen live DOB endpoint.

## MTA Transit Refresh (Initial Connector)

An initial MTA transit refresh connector is available at `src/server/ingestion/mta/stations.ts` with CLI entrypoint `scripts/ingest-mta-transit.ts`.

Configure these variables (optional values shown in `.env.example`):

- `MTA_STATIONS_ENDPOINT`
- `MTA_STATIONS_LIMIT`
- `MTA_MAX_STATIONS_PER_PROPERTY`
- `MTA_MAX_DISTANCE_METERS`

Run ingestion:

```powershell
npm run ingest:mta
```

The connector fetches station rows, normalizes station names/routes/boroughs, fully rebuilds `SubwayStation` and `PropertySubwayConnection`, and recalculates scores for active properties. It uses a full-refresh strategy because `SubwayStation` does not currently carry a stable external ID.

## Amenity Refresh (Initial Connector)

An initial amenity refresh connector is available at `src/server/ingestion/amenities/places.ts` with CLI entrypoint `scripts/ingest-amenities.ts`.

Configure these variables (optional values shown in `.env.example`):

- `MAPBOX_GEOCODING_ENDPOINT`
- `AMENITY_SEARCH_LIMIT`
- `AMENITY_MAX_DISTANCE_METERS`
- `AMENITY_MAX_LINKS_PER_PROPERTY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

Run ingestion:

```powershell
npm run ingest:amenities
```

The connector queries Mapbox geocoding around each tracked neighborhood for grocery stores, pharmacies, parks, and gyms, rebuilds `Amenity` + `PropertyAmenity`, and recalculates scores for active properties. It uses a guarded full-refresh strategy and will abort rather than wipe existing amenities if zero valid places are returned.

## Combined Ingestion Runner

For Windows Task Scheduler, cron, or any external scheduler, a combined runner is available:

```powershell
npm run ingest:all
```

This executes the 311, HPD, DOB, MTA, and amenity connectors sequentially using the same environment variables documented above.

## Ingestion Run Logging

Scheduled CLI runs now record rows in `IngestionRun` with:

- `jobName`
- `status`
- `summary`
- `error`
- `startedAt` / `finishedAt`

This gives you lightweight operational visibility for Windows Task Scheduler, cron, or future dashboards without adding a separate observability service yet.

## Security & Protection

### Rate Limiting

Mutable endpoints (`/api/favorites` POST/DELETE) enforce per-IP rate limits (20 requests per minute) to prevent abuse.

### Security Headers

A global middleware applies standard security headers:

- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-XSS-Protection: 1; mode=block` — legacy XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy` — disables geolocation, microphone, camera

### Authentication

The `/api/favorites` endpoints require active NextAuth sessions. Unsigned requests receive a `401 Unauthorized` response.

### Input Validation

All request bodies and query parameters are validated using Zod schemas before touching the database. Invalid requests receive structured `400 Bad Request` responses.

## 📚 Complete Documentation

- [**PROJECT_SUMMARY.md**](./docs/PROJECT_SUMMARY.md) — What's been built and MVP completion status
- [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) — Production deployment guides (Vercel, Docker, Railway)
- **architecture.md** — System design and data flow

## Deployment

For production deployment guides covering Vercel, self-hosted Docker, Railway, and database setup, see [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md).

Quick start:

```bash
# Vercel (fastest)
npm install -g vercel
vercel

# Docker (self-hosted)
docker-compose up -d

# Railway (simple)
npm install -g @railway/cli
railway up
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

1. Admin dashboard for ingestion run visibility + data management
2. Expand API/UI test coverage and add E2E smoke tests
3. Performance tuning (caching, query optimization, CDN)
4. Extended features (commute profiles, price predictions, crime data)

**Note**: Items above are enhancements. The project is **production-ready** as-is for MVP release.
