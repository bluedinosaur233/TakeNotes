FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/tmp/takenotes-build.db
# SQLite 原生驱动在目标架构内安装；不能复制宿主机 node_modules。
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
# Webpack 同样生成 Next.js 生产构建，避开开发机器的 Turbopack 端口限制。
RUN pnpm exec next build --webpack

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/takenotes.db
ENV PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# 保留 Prisma CLI 供启动迁移及维护使用。第一版优先稳定，未裁剪所有构建依赖。
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src/generated ./src/generated
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/package.json /app/prisma7.config.ts /app/next.config.ts ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "scripts/start-container.mjs"]
