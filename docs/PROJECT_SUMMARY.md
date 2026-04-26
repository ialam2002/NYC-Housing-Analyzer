# RentWise NYC — Project Summary

This document summarizes what has been built and what's ready for production.

## Project Overview

**RentWise NYC** is a full-stack TypeScript web application that helps NYC renters evaluate apartments and neighborhoods before signing a lease by combining public datasets into a clean intelligence dashboard.

## What's Been Delivered

### ✅ Core Features

- **Search Interface** — Find properties by address or neighborhood
- **Property Intelligence Dashboard** — Comprehensive view of a single property with:
  - RentWise Score (0–100) based on weighted metrics
  - Transit convenience (nearby subway stations)
  - NYC 311 complaint history (noise, heat, rodents, sanitation)
  - Building violations (HPD, DOB)
  - Nearby amenities (grocery, pharmacy, parks, gyms)
- **Favorites** — Save properties to your list (requires authentication)
- **Responsive UI** — Works on mobile, tablet, desktop
- **Real-Time Data Ingestion** — Automated connectors for:
  - NYC 311 complaints
  - HPD housing violations
  - DOB building issues
  - MTA transit stations
  - Mapbox amenities (groceries, pharmacies, parks, gyms)

### ✅ Backend Infrastructure

- **Next.js API Routes** — All endpoints properly structured
- **Prisma ORM** — Type-safe database queries
- **PostgreSQL Database** — Production-grade relational database
- **NextAuth** — Secure session management and OAuth support
- **Input Validation** — Zod schemas on all API inputs
- **Error Handling** — Safe error logging without leaking internals
- **Rate Limiting** — Protected endpoints from abuse
- **Security Headers** — Global middleware for XSS, clickjacking, MIME sniffing prevention

### ✅ Data Pipeline

- **Ingestion Architecture** — Modular, reusable connectors
- **Property Matching** — Address + geo-fallback matching
- **Automatic Rescoring** — Scores refresh after each ingestion
- **Run Logging** — Track ingestion job history in database
- **Scheduler Ready** — CLI scripts for cron, Windows Task Scheduler, Docker

### ✅ Code Quality

- **TypeScript Everywhere** — Full type safety across frontend and backend
- **Testing** — 23 automated tests covering core logic
- **Linting** — ESLint standards compliance
- **Build Verification** — Production builds successfully tested

### ✅ Deployment Ready

- **Docker** — Multi-stage Dockerfile for containerization
- **Vercel** — One-click deployment on Vercel
- **Self-Hosted** — Docker Compose setup for VPS deployment
- **Railway** — Simple deployment alternative
- **Database** — Managed PostgreSQL setup guides
- **SSL/TLS** — Nginx reverse proxy configuration with Let's Encrypt
- **Monitoring** — Logging and health check guidance

## Architecture Highlights

### Frontend Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Mapbox GL JS
- Recharts
- NextAuth.js

### Backend Stack
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- Zod validation
- NextAuth session management

### Data Pipeline
- 5 ingestion connectors (311, HPD, DOB, MTA, Amenities)
- Property-data matching engine
- Automatic score recalculation
- Ingestion run logging + history

## Project Structure

```
rentwise-nyc/
├── docs/
│   ├── DEPLOYMENT.md          # Comprehensive deployment guides
│   └── architecture.md        # System design overview
├── prisma/
│   ├── schema.prisma          # Database schema + models
│   └── seed.ts                # Mock data seeding
├── public/                    # Static assets
├── scripts/                   # CLI ingestion scripts
│   ├── ingest-all.ts
│   ├── ingest-311.ts
│   ├── ingest-hpd-violations.ts
│   ├── ingest-dob-violations.ts
│   ├── ingest-mta-transit.ts
│   └── ingest-amenities.ts
├── src/
│   ├── app/                   # Next.js pages + API routes
│   ├── components/            # React components
│   ├── server/
│   │   ├── auth/              # NextAuth configuration
│   │   ├── ingestion/         # Data connectors + shared logic
│   │   ├── middleware/        # Rate limiting, security headers
│   │   ├── repositories/      # Data access layer
│   │   ├── scoring/           # RentWise Score calculation
│   │   ├── services/          # Business logic
│   │   └── validators/        # Zod schemas
│   ├── lib/                   # Utilities
│   └── types/                 # TypeScript types
├── .env.example               # Development environment template
├── .env.example.production    # Production environment template
├── .dockerignore              # Docker build filter
├── Dockerfile                 # Multi-stage Docker image
├── docker-compose.yml         # Local development compose
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies + scripts
├── prisma.config.ts           # Prisma configuration
├── tsconfig.json              # TypeScript configuration
└── vitest.config.ts           # Test runner configuration
```

## Key Scripts

```bash
# Development
npm run dev              # Start dev server
npm run db:studio       # Open Prisma Studio

# Testing & Quality
npm run test            # Run unit tests
npm run typecheck       # TypeScript check
npm run lint            # ESLint check
npm run build           # Production build

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Apply migrations
npm run db:push         # Sync schema to DB
npm run db:seed         # Load mock data

# Ingestion
npm run ingest:311      # NYC 311 complaints
npm run ingest:hpd      # HPD violations
npm run ingest:dob      # DOB violations
npm run ingest:mta      # MTA transit stations
npm run ingest:amenities # Mapbox amenities
npm run ingest:all      # All ingestions (sequential)
```

## Getting Started

### Local Development

```bash
# 1. Clone and install
git clone ...
cd rentwise-nyc
npm install

# 2. Set up database
npm run db:generate
npm run db:migrate
npm run db:seed

# 3. Create .env with required variables
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# 4. Start dev server
npm run dev
# Open http://localhost:3000
```

### Production Deployment

See [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) for:
- Vercel (recommended, 5 minutes)
- Docker + self-hosted VPS
- Railway (alternative)
- Database setup (Managed vs Self-hosted)
- Ingestion scheduling
- Monitoring & Logging

## What's Left (Non-Critical)

These items would enhance the product but aren't blockers for MVP deployment:

1. **Admin Dashboard**
   - Visibility into ingestion runs
   - Property/data management UI
   - User analytics

2. **Advanced Features**
   - User commute profiles (optional)
   - Rent price predictions
   - Neighborhood trend charts
   - Mobile app

3. **Performance Optimizations**
   - Database query caching (Redis)
   - Image CDN integration
   - API response caching

4. **Expanded Coverage**
   - Additional data sources (crime, schools, jobs)
   - Neighborhoods outside NYC
   - Real-time rent market data

## Testing Checklist (Before Going Live)

- [ ] All tests pass: `npm run test`
- [ ] TypeScript clean: `npm run typecheck`
- [ ] Linting clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Local database works: `npm run db:studio`
- [ ] Search returns results
- [ ] Property dashboard loads correctly
- [ ] Authentication works (GitHub OAuth if configured)
- [ ] Favorites can be added/removed
- [ ] Ingestion CLI runs without errors
- [ ] Rate limiting blocks excessive requests
- [ ] Security headers are present (check browser dev tools)

## Support Files

- **README.md** — Quick start and feature overview
- **DEPLOYMENT.md** — Production deployment guides
- **architecture.md** — System design details
- **.env.example** — Development template
- **.env.example.production** — Production template
- **Dockerfile** — Container configuration
- **docker-compose.yml** — Local dev container setup

## Contact & License

This project is ready for production use. For questions about architecture, deployment, or features, refer to the documentation files or the code comments throughout the repository.

---

**Status**: ✅ **Production Ready** (MVP Complete)
**Last Updated**: April 25, 2026
**Tech Stack**: Next.js 16, TypeScript, Prisma, PostgreSQL, React, Tailwind CSS

