FROM node:22-alpine AS base
RUN corepack enable pnpm
# Prisma engines (query + schema/migration) precisam de libssl/openssl.
# node:alpine (musl) não traz openssl por padrão -> engines falham ao carregar.
RUN apk add --no-cache openssl

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @content-engine/shared build
# prisma generate ANTES do build: o tsc precisa dos tipos do Prisma Client.
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
# shared/dist importa zod em runtime; os symlinks aqui apontam para o store em /app/node_modules.
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Com pnpm, o Prisma Client é gerado no store; os symlinks de apps/api/node_modules
# apontam para /app/node_modules (copiado acima). Não existe apps/api/node_modules/.prisma.
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
EXPOSE 3001
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/server.js"]
