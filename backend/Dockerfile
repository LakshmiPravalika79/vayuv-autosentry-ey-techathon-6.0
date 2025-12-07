# Backend Dockerfile for AutoSentry AI
FROM node:18-slim

# Install dependencies including OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY . .

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs expressjs

# Set permissions
RUN chown -R expressjs:nodejs /app

USER expressjs

ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run with ts-node directly (transpile on the fly)
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
