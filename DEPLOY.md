# Betrieb: Docker, Postgres, CI

Die App ist **ein** Bun-Prozess: er liefert die Website, die Team-App (server-gerendertes Frontend)
und die API inklusive WebSockets auf einem Port. Deshalb besteht der Stack aus zwei Diensten:
`app` (Bun) und `db` (Postgres 16). PGlite bleibt nur für die lokale Entwicklung ohne Docker.

## Lokal mit Docker / OrbStack

```bash
cp .env.example .env        # PHALA_API_KEY, POSTGRES_PASSWORD eintragen
docker compose up -d --build
open http://localhost:3000
```

- Migrationen und Seeds laufen beim Start der App automatisch gegen Postgres.
- Daten liegen im Volume `pgdata` (`docker compose down -v` löscht sie).
- Logs: `docker compose logs -f app`

## Produktion auf einem beliebigen Server

Voraussetzung: Docker mit Compose, eine Domain, die auf den Server zeigt (Passkeys brauchen HTTPS).

```bash
mkdir -p /opt/huh && cd /opt/huh
# docker-compose.yml, docker-compose.prod.yml, deploy/Caddyfile und .env auf den Server legen
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`.env` auf dem Server braucht zusätzlich `DOMAIN=…` und optional `APP_IMAGE=ghcr.io/avenvictorio/huh:latest`.
Caddy holt das Zertifikat selbst und leitet auf `app:3000` weiter; der App-Port ist nach außen zu.

## CI (GitHub Actions, `.github/workflows/ci.yml`)

1. **test** – bei jedem Push/PR: Abhängigkeiten, Bundle-Check, Server gegen ein echtes Postgres
   starten (alle Migrationen müssen durchlaufen), öffentliche Endpunkte und ein validierter
   Schreibpfad werden geprüft.
2. **image** – auf `main`: Docker-Image bauen und nach `ghcr.io/<owner>/huh` pushen (`latest` + Commit-SHA).
3. **deploy** – auf `main`, nur wenn Secrets hinterlegt sind: per SSH `docker compose pull && up -d`.
   Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, optional `DEPLOY_PATH` (Standard `/opt/huh`).

## Ohne Docker (Entwicklung)

`bun run dev` – eingebettetes PGlite unter `data/pg`, keine weitere Infrastruktur nötig.
`DATABASE_URL` setzen schaltet auf ein externes Postgres um; der Code ist identisch.
