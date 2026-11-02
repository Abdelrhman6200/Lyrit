# LYRIT — Premium Hair Care E-Commerce

A responsive storefront and admin dashboard for LYRIT, built to the PRD v1.0 (Nov 2026).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 6 · Zod · Docker Compose + Caddy (Hostinger VPS).

## Quick start (development)

```bash
cp .env.example .env                                   # adjust values
docker compose -f docker-compose.dev.yml up -d         # or use any local PostgreSQL 16
npm install
npx prisma migrate deploy
npm run db:seed                                        # sample catalog, content, shipping, super admin
npm run dev                                            # http://localhost:3000
```

Admin: `http://localhost:3000/admin`. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and **change the password** afterwards.

Sample discount codes: `WELCOME10` (10%, once per customer) and `RITUAL100` (EGP 100 off over EGP 1,200).

Card payments use a **mock gateway** in development. It runs through the same signed-webhook path a real gateway would.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | Static checks |
| `npm test` | Unit tests + DB integration tests (uses `DATABASE_URL`; point it at a disposable DB) |
| `npm run db:migrate` | Create a migration (dev) |
| `npm run db:deploy` | Apply migrations (staging/prod) |
| `npm run db:seed` | Idempotent seed |

## Project structure

```
src/app/(store)/      Customer storefront routes (PRD §4.1)
src/app/admin/        Admin dashboard (PRD §12)
src/app/api/          Webhooks, uploads, health, cron
src/features/         Business logic — catalog, cart, checkout, orders, inventory, payments,
                      discounts, shipping, customers, content, notifications, admin
src/lib/              db, auth (sessions + RBAC), validation, money, rate limiting, audit, media
src/components/       UI components
prisma/               Schema, migrations, seed
tests/                Vitest unit + integration tests
deploy/               Caddyfile, backup/restore scripts
docs/                 Architecture, deployment, admin guide
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): design decisions, how the PRD maps to code, business-rule enforcement
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Hostinger VPS deployment, backups, restore, monitoring
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md): day-to-day store operations for LYRIT staff
- [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md): client decisions and integrations still pending
