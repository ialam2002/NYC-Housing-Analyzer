FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Prisma
RUN npm run db:generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for runtime
COPY prisma ./prisma

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start application
CMD ["npm", "run", "start"]

# Expose port
EXPOSE 3000

# Add labels
LABEL org.opencontainers.image.title="RentWise NYC" \
      org.opencontainers.image.description="Housing Intelligence Platform for NYC Renters" \
      org.opencontainers.image.vendors="RentWise" \
      org.opencontainers.image.url="https://github.com/yourusername/nyc-housing-analyzer"

