FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy root configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared and server source
COPY shared/ ./shared/
COPY server/ ./server/

# Generate Prisma client
RUN cd server && npx prisma generate

# Build shared first
RUN cd shared && pnpm build

# Build server
RUN cd server && pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/index.js"]
