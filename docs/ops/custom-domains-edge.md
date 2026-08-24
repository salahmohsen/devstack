# Custom domains — operator edge (Dokploy + Cloudflare Tunnel)

Tenants only configure **DNS + Domain settings** (TXT + CNAME). They never use Tunnel or Dokploy.

This doc is the **instance operator** checklist so that works after the compose → separate Dokploy apps migration.

## What broke in the migration

| Layer       | Compose (worked)                         | Separate apps (broke)                                      |
| ----------- | ---------------------------------------- | ---------------------------------------------------------- |
| Traefik web | `PathPrefix(\`/\`)` priority 1 catch-all | Dokploy only emits `Host(devstack…)` per registered domain |
| Tunnel      | Effectively any Host → Traefik           | Only **Published hostnames** (devstack, api, …)            |
| Tenant      | CNAME + TXT                              | Same — but edge no longer accepted unknown Hosts           |

App logic (verify TXT, `Host` → portfolio) did not change.

## Tenant path (no tunnel)

Documented in dashboard Domain settings:

1. **TXT** `_career-verify.<tenant-domain>` = verification token
2. **CNAME** `<tenant-domain>` → primary app host from `VITE_WEB_URL` (e.g. `devstack.example.com`)
3. **Verify** in the app

The app routes by `Host` once traffic reaches the web container with `passHostHeader: true`.

## Operator: Traefik (Dokploy web app)

Compose parity for `apps/web`:

```yaml
# Primary app host (dashboard / cookies) — high priority
Host(`devstack.example.com`) → web:3000  priority 100

# Multi-tenant custom domains — low priority catch-all
PathPrefix(`/`) → web:3000  priority 1
passHostHeader: true
```

- Other apps (`api`, `agent`) keep **specific** `Host` / path rules with **higher** priority than `1`.
- Do **not** add each tenant domain in Dokploy Domains UI (does not scale).
- Advanced → Traefik config on the web application is the right place for the catch-all when using separate apps.

Reference compose labels: `docker-compose.yml` (`traefik.http.routers.web.rule=PathPrefix(\`/\`)`).

## Operator: Cloudflare Tunnel

Published applications are **per hostname**. For multi-tenant CNAME, you need a **fallback** that sends every unmatched Host to Traefik:

```text
# Specific (examples)
devstack.example.com → http://dokploy-traefik:80
api.example.com      → http://dokploy-traefik:80

# Catch-all LAST (no hostname / “Catch-all” in Zero Trust UI)
*                    → http://dokploy-traefik:80
```

Service URL must match how Traefik listens (this stack: **HTTP :80**, not HTTPS to the container).

### Your own apex on the same zone as the app

If the operator’s portfolio uses `example.com` while the primary app is `devstack.example.com`:

- Prefer Tunnel **Published hostname** `example.com` → `http://dokploy-traefik:80`, **or**
- Apex CNAME (flatten) → **tunnel hostname** (`dokploy-tunnel` / `*.cfargotunnel.com`)
- **Avoid** proxied apex CNAME → `devstack.example.com` (orange-cloud → orange-cloud) — common CF 502

Tenants on **other** zones CNAME to `devstack.example.com` (or a dedicated `cname.example.com`); that does not require them to open Tunnel.

## Operator checklist

- [ ] Web Traefik: primary `Host` + low-priority catch-all + `passHostHeader: true`
- [ ] Tunnel: catch-all / fallback → `http://dokploy-traefik:80`
- [ ] Specific tunnel hostnames for devstack/api as needed
- [ ] SSL terminated at Cloudflare (Flexible or Full as appropriate for HTTP origin)
- [ ] Dashboard Domain settings show TXT + CNAME target = `VITE_WEB_URL` hostname
- [ ] Smoke: external test domain CNAME → devstack, verify TXT, open Host → portfolio

## Related

- Product design: `docs/superpowers/specs/2026-07-27-multi-user-tenancy-restructure-design.md`
- Browser CORS for custom origins: `docs/superpowers/specs/2026-08-08-custom-domain-browser-origin-trust-design.md`
