# RentWise NYC — Deployment Runbooks

This guide covers deploying RentWise NYC to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] TypeScript clean: `npm run typecheck`
- [ ] Linter passing: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] All environment variables documented and set
- [ ] Database migrations tested and reversible
- [ ] Secrets stored in secrets manager, not committed to git
- [ ] Rate limits tuned for your traffic profile
- [ ] Monitoring and alerting configured

## Environment Setup

### Required Environment Variables

**Core:**
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — Your application's public URL
- `NEXTAUTH_SECRET` — A 32+ character random string for session encryption
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — Mapbox public token

**Optional Auth:**
- `GITHUB_ID` — For GitHub OAuth
- `GITHUB_SECRET` — For GitHub OAuth

**Optional Ingestion Config (tune to your data needs):**
- `NYC_311_LIMIT` — Records per ingestion run (default 500)
- `NYC_311_DAYS_BACK` — Lookback window (default 30 days)
- `HPD_VIOLATIONS_LIMIT` — Records per run (default 500)
- `HPD_VIOLATIONS_DAYS_BACK` — Lookback window (default 30 days)
- `DOB_VIOLATIONS_LIMIT` — Records per run (default 500)
- `DOB_VIOLATIONS_DAYS_BACK` — Lookback window (default 30 days)
- `MTA_STATIONS_LIMIT` — Records per run (default 1000)
- `MTA_MAX_STATIONS_PER_PROPERTY` — Max links per property (default 6)
- `MTA_MAX_DISTANCE_METERS` — Walk radius for transit (default 2000m)
- `AMENITY_SEARCH_LIMIT` — Results per Mapbox query (default 8)
- `AMENITY_MAX_DISTANCE_METERS` — Radius for amenity search (default 2500m)
- `AMENITY_MAX_LINKS_PER_PROPERTY` — Max amenity links per property (default 12)

### Generating NEXTAUTH_SECRET

```bash
# On Linux/macOS
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

## Deployment Options

### Option 1: Vercel (Recommended for Fastest Start)

#### 1. Connect Repository

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel
```

Follow the interactive prompts:
- Import existing project
- Select Next.js as framework
- Override build command if needed
- Set environment variables in Vercel dashboard

#### 2. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

1. Add `DATABASE_URL` (mark as "Sensitive")
2. Add `NEXTAUTH_SECRET` (mark as "Sensitive")
3. Add `NEXTAUTH_URL` → Your production URL (e.g., `https://rentwise-nyc.vercel.app`)
4. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
5. Add optional OAuth secrets if using GitHub login

#### 3. PostgreSQL on Vercel Postgres

Vercel offers managed PostgreSQL:

```bash
# Install Vercel Postgres plugin
vercel env pull

# This creates `.env.local` with DATABASE_URL
```

Or use external PostgreSQL:
- AWS RDS
- Railway
- Supabase
- DigitalOcean Managed Database

#### 4. Deploy

```bash
# Automatic deploy on push to main
git push origin main
```

---

### Option 2: Self-Hosted (Docker / Linux VPS)

#### 1. Prepare VPS

```bash
# On Ubuntu 22.04 LTS VPS
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl docker.io docker-compose nodejs npm postgresql-client

# Add current user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

#### 2. PostgreSQL Setup

```bash
# Option A: Managed PostgreSQL (Recommended)
# Use AWS RDS, Railway, or Supabase

# Option B: Self-hosted PostgreSQL in Docker
docker run -d \
  --name rentwise-postgres \
  -e POSTGRES_DB=rentwise \
  -e POSTGRES_USER=rentwise_user \
  -e POSTGRES_PASSWORD=<SECURE_PASSWORD> \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine

# Create connection string
DATABASE_URL="postgresql://rentwise_user:<PASSWORD>@localhost:5432/rentwise"
```

#### 3. Create Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    image: node:20-alpine
    working_dir: /app
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: ${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    command: >
      sh -c "npm ci &&
             npm run db:generate &&
             npm run db:migrate &&
             npm run build &&
             npm run start"
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: rentwise
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 4. Environment File

```bash
# .env.production
DATABASE_URL="postgresql://rentwise_user:SECURE_PASSWORD@db-host:5432/rentwise"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="... your 32+ char secret ..."
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk_..."

# Ingestion (optional, adjust for your data volume)
NYC_311_LIMIT=500
NYC_311_DAYS_BACK=30
HPD_VIOLATIONS_LIMIT=500
MTA_STATIONS_LIMIT=1000
```

#### 5. Deploy

```bash
# Copy files to VPS
scp -r . user@vps-ip:/home/user/rentwise-nyc

# SSH into VPS
ssh user@vps-ip

# Navigate and deploy
cd /home/user/rentwise-nyc
docker-compose up -d
```

#### 6. Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/rentwise-nyc
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable with Let's Encrypt:

```bash
sudo certbot certonly --nginx -d your-domain.com
sudo systemctl restart nginx
```

---

### Option 3: Railway (Simple Alternative)

#### 1. Connect Repository

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway init
```

#### 2. Create Database

```bash
railway add postgresql
```

#### 3. Set Environment Variables

```bash
railway variables set DATABASE_URL=...
railway variables set NEXTAUTH_SECRET=...
railway variables set NEXTAUTH_URL=https://rentwise.onrailway.app
railway variables set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=...
```

#### 4. Deploy

```bash
railway up
```

---

## Database Migrations

### Pre-Deployment Testing

```bash
# Test migration with local copy
npm run db:migrate

# Verify schema in Prisma Studio
npm run db:studio
```

### Production Migration

```bash
# Backup database before migration
pg_dump $DATABASE_URL > backup_$(date +%s).sql

# Run migration
npm run db:migrate

# Verify migration success
npm run db:studio
```

### Rollback Procedure

```bash
# If something goes wrong:
# 1. Stop application traffic
# 2. Restore from backup
psql $DATABASE_URL < backup_TIMESTAMP.sql

# 3. Verify data integrity
npm run db:studio
```

---

## Ingestion Scheduling

### Cron Job (Linux)

```bash
# Edit crontab
crontab -e

# Run all ingestions daily at 2 AM
0 2 * * * cd /home/user/rentwise-nyc && npm run ingest:all >> /var/log/rentwise-ingest.log 2>&1

# Run just amenities weekly (Sunday at 3 AM)
0 3 * * 0 cd /home/user/rentwise-nyc && npm run ingest:amenities >> /var/log/rentwise-ingest.log 2>&1
```

### Windows Task Scheduler

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run ingest:all" -WorkingDirectory "C:\rentwise-nyc"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "RentWise-Ingestion" -Description "Daily data ingestion"
```

### Docker Cron Container

```yaml
services:
  scheduler:
    image: mcuadros/ofelia:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: daemon --docker
    depends_on:
      - app

# Add to app service:
  app:
    labels:
      ofelia.enabled: "true"
      ofelia.job-exec.ingest-daily.schedule: "@daily"
      ofelia.job-exec.ingest-daily.command: "npm run ingest:all"
```

---

## Monitoring & Observability

### Error Logging

```bash
# Collect logs from production
docker logs rentwise-app > app.log

# Monitor real-time
docker logs -f rentwise-app
```

### Database Monitoring

```bash
# Connect to production database
psql $DATABASE_URL

# Check ingestion run history
SELECT jobName, status, summary, startedAt, finishedAt 
FROM "IngestionRun" 
ORDER BY startedAt DESC 
LIMIT 10;
```

### Health Check

```bash
# Simple health endpoint can be added later
curl https://your-domain.com/api/health
```

---

## Troubleshooting

### Common Issues

**Database connection fails**
```bash
# Test connection string
psql $DATABASE_URL -c "SELECT NOW();"

# Check Prisma can connect
npm run db:studio
```

**Ingestion fails**
```bash
# Check ingestion run logs
npm run db:studio
# Navigate to IngestionRun table
```

**Out of memory**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 node_modules/.bin/next start

# Or in Docker, increase container memory
docker run --memory 2g ...
```

---

## Performance Tuning

### Database Connection Pooling

For production, configure Prisma connection pool in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Production connection pool (adjust for your load)
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

### API Rate Limits

Rate limits are currently hardcoded in `src/server/middleware/rate-limiter.ts`. Adjust based on traffic:

```typescript
const RATE_LIMIT_MAX_REQUESTS = 30; // per 60 seconds
```

### Next.js Optimizations

```bash
# Enable ISR (incremental static regeneration) for search results
# Configure in next.config.ts if needed

# Use Image Optimization
# Offload to CDN for production
```

---

## Post-Deployment

1. Monitor application logs for errors
2. Verify all ingestion runs complete successfully
3. Test authentication flow (login/logout)
4. Verify favorites API (protected endpoint)
5. Check search and property pages load correctly
6. Monitor database performance

---

## Rollback Procedure

If deployment breaks:

```bash
# Option 1: Revert application code
git revert <commit-hash>
git push  # Auto-redeploy on Vercel

# Option 2: Restore from backup
docker-compose down
docker pull <previous-image>
docker-compose up -d

# Option 3: Full database restore
psql $DATABASE_URL < backup_previous.sql
```

