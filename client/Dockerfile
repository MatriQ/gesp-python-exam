FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY shared/package.json ./shared/package.json
COPY client/package.json ./client/package.json

RUN pnpm install --frozen-lockfile

COPY shared/ ./shared/
COPY client/ ./client/

RUN cd shared && pnpm build
RUN cd client && pnpm build

# Nginx stage
FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
