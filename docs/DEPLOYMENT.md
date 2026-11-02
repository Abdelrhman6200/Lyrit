# Deployment — Hostinger VPS

## 1. Server preparation (Ubuntu 24.04 LTS, KVM 2 or larger)
```bash
adduser deploy && usermod -aG sudo deploy           # then use SSH keys only; disable password + root login
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
curl -fsSL https://get.docker.com | sh && usermod -aG docker deploy
apt install -y unattended-upgrades age rclone
```
Point the domain's A/AAAA records at the VPS.

## 2. Configure
```bash
git clone <repo> /opt/lyrit && cd /opt/lyrit
cp .env.example .env.production
```
Set at least these values: `APP_URL=https://<domain>`, `APP_ENV=production`, `SITE_DOMAIN=<domain>`, `POSTGRES_PASSWORD`, `AUTH_SECRET`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `CRON_SECRET`, `EMAIL_*`, `SEED_ADMIN_*`. Use `openssl rand -hex 32` for each secret. Never commit this file.

## 3. Deploy
```bash
docker compose --env-file .env.production up -d --build     # runs migrations, then the app, behind Caddy (auto-HTTPS)
curl -fsS https://<domain>/api/health                       # sanity
# First deploy only — seed from a workstation through an SSH tunnel to the DB container (seed needs dev dependencies):
#   DATABASE_URL=... npm run db:seed
```
PostgreSQL sits only on the internal Docker network and is never published.

**Updating:** `deploy/backup.sh` (take a pre-deploy backup) → `git pull` → `docker compose --env-file .env.production up -d --build`. The `migrate` service applies migrations before the app starts.

**Rollback:** `git checkout <previous-tag>`, then rebuild. If a migration was destructive, restore the pre-deploy backup.

## 4. Scheduled jobs (host crontab)
```cron
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/expire-orders
15 3 * * *  /opt/lyrit/deploy/backup.sh >> /var/log/lyrit-backup.log 2>&1
```
For the cron job to reach the app, publish port 3000 to localhost only (`ports: ["127.0.0.1:3000:3000"]` on `app`) or run the request through `docker compose exec`. Caddy blocks `/api/cron/*` from the internet.

## 5. Backups & restore (PRD §15.3)
- `deploy/backup.sh` dumps the database and uploads, encrypts them with **age**, and copies them **off-server** with **rclone**.
- Set retention with a lifecycle rule on the remote bucket.
- Restore with `deploy/restore.sh <file>`. **Test a restore on staging at least monthly** and before launch.

## 6. Environments
Run staging as a second compose project on another subdomain (`APP_ENV=staging`, which blocks crawlers), using a gateway sandbox, `ALLOW_MOCK_PAYMENTS` only if needed, and a copy of anonymised data.

## 7. Monitoring
- Uptime: monitor `GET /api/health` (it checks the DB) with UptimeRobot, Better Stack or similar.
- Errors: add Sentry (or equivalent) via `instrumentation.ts`. The app logs structured errors for checkout, webhooks and email to stdout. Use `docker compose logs -f app`.
- Disk: alert when the volume is ≥ 80% full.

## 8. Pre-launch checklist
- HTTPS valid, with an A+ on SSL Labs.
- `APP_ENV=production`, real gateway configured, and `ALLOW_MOCK_PAYMENTS` unset.
- Seeded admin password changed, and real staff accounts created with the right roles.
- Placeholder copy, images, policies and prices replaced, and claims approved.
- A full backup and restore tested.
- Test orders placed for COD and for card (success, failure, duplicate webhook), then refunded or canceled.
- Lighthouse mobile ≥ 85 on the home, PLP and PDP pages.
