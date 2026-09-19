# abdspace-ops

Private dashboard for VPS health, Docker Swarm services, deployments, PostgreSQL
backups, and operational links.

## Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Run all local checks with:

```bash
pnpm check
pnpm build
```

## Configuration

Copy `.env.example` and set the deployment-specific values.

`DASHBOARD_SERVICES` and `DASHBOARD_DEPLOYMENTS` use comma-separated
`Label=service-name` entries:

```env
DASHBOARD_SERVICES=Web=example-web,API=example-api,Database=example-db
DASHBOARD_DEPLOYMENTS=Web=example-web,API=example-api
```

`DASHBOARD_LINKS` uses comma-separated `Label=https://...` entries:

```env
DASHBOARD_LINKS=Dokploy=https://dokploy.example.com,Uptime Kuma=https://status.example.com,App Status=https://app-status.example.com
```

Optional `DASHBOARD_SERVICE_LINKS` uses the same format. Labels must match
`DASHBOARD_SERVICES` labels, and URLs should be copied from the corresponding
Dokploy service pages:

```env
DASHBOARD_SERVICE_LINKS=Web=https://dokploy.example.com/services/web,API=https://dokploy.example.com/services/api
```

Service names may use their stable prefix so Dokploy's generated suffix can
change between deployments.

## Deployment

GitHub Actions builds the existing production `Dockerfile` on pushes to `main`
and on manual dispatch. It publishes both `latest` and the full commit SHA to
GHCR. Set this value in Dokploy, replacing `example-owner` with the GitHub owner:

```env
OPS_IMAGE=ghcr.io/example-owner/abdspace-ops:latest
```

Deploy `docker-compose.yml` as a Dokploy Compose application. Dokploy pulls the
published image; the VPS does not build it.

Before deployment, create the disk probe directory:

```bash
sudo mkdir -p /srv/ops-disk-probe
```

Set `BACKUP_LOG_HOST_PATH=/var/log/taskgid-backup.log`. The file must be readable
by the container's `node` user. If logrotate renames the file, use `copytruncate`
for this log so the bind mount continues to receive updates.

Assign `ops.abdspace.xyz` to dashboard port `3000` in Dokploy. Neither service
publishes a host port. The socket proxy only joins the private `ops` network.

The GHCR package may be private. If it is, configure a GHCR registry credential
in Dokploy with read-only package access so Dokploy can pull the image. Keep all
runtime secrets and environment variables in Dokploy; the publishing workflow
does not send them to GitHub Actions or deploy directly to the VPS.

## Security

The dashboard accesses Docker through `tecnativa/docker-socket-proxy`. The Nuxt
container does not mount `/var/run/docker.sock`. The proxy allows read access to
containers, services, and tasks, keeps `POST=0`, and is not connected to
`dokploy-network`.

The only host mounts are:

- `/srv/ops-disk-probe:/host-disk:ro`
- `/var/log/taskgid-backup.log:/backups/backup.log:ro`

The dashboard also writes its own SQLite history to the private `ops-history`
Docker volume at `/data/history.sqlite`. This is not a host filesystem mount or
another service. It stores one-minute host and availability readings plus
observed deployment and backup events, and removes records after 32 days. The
volume persists across normal redeploys; removing the Compose volume deletes
the history. It is not covered by the PostgreSQL backup job.

`DASHBOARD_HISTORY_PATH` is optional for local development. When unset or when
the volume cannot be written, current status still works and the History panel
reports that storage is unavailable. The runtime uses Node 22's built-in SQLite
API, which is still marked experimental by Node.

`DASHBOARD_REQUIRE_CF_ACCESS` defaults to `false`. Its header check is not an
authentication boundary while the origin remains directly reachable.

JWT validation is enabled when both `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`
are set. Restrict origin access separately if requests must only arrive through
Cloudflare.

Recent service logs and diagnostic snapshots are disabled by default. To enable
them, set `DASHBOARD_ENABLE_SENSITIVE_DIAGNOSTICS=true` along with both
`CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`. The app verifies the Access JWT on
every request; the header-only `DASHBOARD_REQUIRE_CF_ACCESS` mode does not unlock
these endpoints. Logs may contain secrets, so only trusted operators should
have Access to this application. The app fetches at most 100 recent service-log
lines and limits the response to 256 KiB. No Docker write methods are enabled.
