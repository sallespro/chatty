# Build stage
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY packages/lib/package.json packages/lib/
COPY packages/sdk/package.json packages/sdk/
COPY packages/cli/package.json packages/cli/
COPY server/package.json server/
COPY ui/package.json ui/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN cd ui && npx vite build

# Production stage
FROM node:22-bookworm-slim

WORKDIR /app

# Copy everything from build stage
COPY --from=build /app .

# Create data directory for workspaces
RUN mkdir -p /app/data/workspaces

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server/src/index.js"]
