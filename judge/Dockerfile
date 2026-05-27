FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install docker CLI for exec-based sandbox
RUN apk add --no-cache docker-cli

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./
COPY judge/package.json ./judge/package.json

RUN pnpm config -g set onlyBuiltDependencies "esbuild,@prisma/engines,@prisma/client,cpu-features,protobufjs,ssh2"
RUN pnpm install --frozen-lockfile

COPY judge/ ./judge/

RUN cd judge && pnpm build

EXPOSE 3001

CMD ["node", "judge/dist/index.js"]
