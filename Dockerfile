# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of /app to nodejs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4321

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

CMD ["node", "./dist/server/entry.mjs"]