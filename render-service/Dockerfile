# Servicio de render de video (Remotion). Debian, NO Alpine: Chromium necesita glibc.
FROM node:22-bookworm-slim

# Dependencias de sistema para Chromium headless + ffmpeg + fuentes.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 libxrandr2 \
    libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 \
    libpango-1.0-0 libcairo2 libcups2 libx11-6 libxext6 libxi6 \
    ffmpeg fonts-liberation fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
# Compila el servicio Node (dist/). Los archivos de src/remotion los empaqueta
# Remotion en runtime, no tsc (por eso quedan como fuente en la imagen).
RUN npm run build

# Baja el navegador de Remotion en build para que el primer render no espere la descarga.
RUN npx remotion browser ensure

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002
CMD ["node", "dist/server.js"]
