# stage1: install all deps (dev deps are required for `next build` / Tailwind / TypeScript in this app),
# build, then prune to production `node_modules` for the final image.
FROM cgr.dev/chainguard/node:latest-dev AS stage1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build
RUN npm prune --omit=dev

# stage2: run Next with only artifacts and pruned `node_modules`
FROM cgr.dev/chainguard/node:latest AS stage2
WORKDIR /app
ENV NODE_ENV=production
COPY --from=stage1 /app/.next ./.next
COPY --from=stage1 /app/node_modules ./node_modules
COPY --from=stage1 /app/public ./public
COPY --from=stage1 /app/package.json ./package.json
COPY --from=stage1 /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
