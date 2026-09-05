# Hand aufs Herz – ein Bun-Prozess liefert Website, Team-App (Frontend) und API/WebSockets.
# Stufe 1: Svelte-Flow-Canvas der Skills bauen (eine HTML-Datei nach public/).
FROM oven/bun:1 AS canvas
WORKDIR /ui
COPY skills-ui/package.json skills-ui/bun.lock ./
RUN bun install --frozen-lockfile
COPY skills-ui/ ./
# vite.config.ts schreibt nach ../public -> hier /public/skills-canvas.html
RUN mkdir -p /public && bunx vite build

# Stufe 2: Laufzeit
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
COPY --from=canvas /public/skills-canvas.html public/skills-canvas.html
EXPOSE 3000
# Ohne Shell-Wrapper, damit SIGTERM direkt bei Bun ankommt (sauberes Schließen).
CMD ["bun", "run", "index.ts"]
