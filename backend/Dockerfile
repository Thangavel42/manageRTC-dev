# Backend Dockerfile
# Multi-stage build for production deployment with security best practices

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript (if applicable) and run any build scripts
RUN npm run build --if-present

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

# Install security updates and dumb-init
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S manageRTC && \
    adduser -S manageRTC -u 1001 -G manageRTC

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built source from build stage
COPY --from=build --chown=manageRTC:manageRTC /app/config ./config
COPY --from=build --chown=manageRTC:manageRTC /app/utils ./utils
COPY --from=build --chown=manageRTC:manageRTC /app/middleware ./middleware
COPY --from=build --chown=manageRTC:manageRTC /app/controllers ./controllers
COPY --from=build --chown=manageRTC:manageRTC /app/routes ./routes
COPY --from=build --chown=manageRTC:manageRTC /app/services ./services
COPY --from=build --chown=manageRTC:manageRTC /app/models ./models
COPY --from=build --chown=manageRTC:manageRTC /app/jobs ./jobs
COPY --from=build --chown=manageRTC:manageRTC /app/socket ./socket
COPY --from=build --chown=manageRTC:manageRTC /app/public ./public
COPY --from=build --chown=manageRTC:manageRTC /app/server.js ./server.js

# Copy dist directory if it exists
COPY --from=build --chown=manageRTC:manageRTC /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R manageRTC:manageRTC /app

# Switch to non-root user
USER manageRTC

# Expose port
EXPOSE 5000

# Health check using the new health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health/liveness || exit 1

# Set environment to production
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
