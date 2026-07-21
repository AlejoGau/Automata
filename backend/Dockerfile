# ── Etapa 1: build (compila TypeScript → dist/) ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Etapa 2: runtime (imagen final liviana, solo deps de producción) ──
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Nichos empaquetados dentro de la imagen (Marketing Studio los lee en runtime)
ENV MARKETING_NICHES_DIR=/app/niches
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY niches ./niches
EXPOSE 3001
CMD ["node", "dist/server.js"]
