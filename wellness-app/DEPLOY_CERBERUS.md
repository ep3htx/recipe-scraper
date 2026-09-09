# Deploying to cerberus

This is the cerberus-specific companion to the main [README](./README.md).
It assumes the environment documented in your infra reconstruction doc:
Ubuntu Server, Portainer-managed stacks, a shared external `proxy` network,
Nginx Proxy Manager (NPM) as the box's reverse proxy, and
`DOCKER_DATA=/opt/docker-data`.

Use **`docker-compose.portainer.yml`**, not the standalone
`docker-compose.yml` — the standalone one runs its own Nginx on 80/443,
which NPM already owns on this host. The Portainer variant drops that
container entirely and joins the shared `proxy` network instead, matching
how every other stack here (`network`, `vaultwarden`, `lamp`, `nextcloud`,
`homer`, `monitoring`) is wired.

The existing PHP/MySQL wellness tracker at `lamp-web:8083/wellness/` is
untouched by any of this — this deploys as a fully separate stack. Nothing
here reads or writes `lampdb`.

## One real difference from your other stacks

Every stack in your reconstruction doc uses a pre-built public image —
nothing there runs a custom `build:`. This stack does: `wellness-backend`
and `wellness-frontend` are built from source (there's no published image
to pull). Two ways to handle that in Portainer:

**Option A — Git repository stack (recommended, least manual work).**
Portainer → Stacks → Add stack → **Repository** tab (not Web editor):
- Repository URL: this repo's URL
- Reference: the branch/tag you want deployed
- Compose path: `wellness-app/docker-compose.portainer.yml`

Portainer clones the repo server-side and runs the build itself, so
`context: ./backend` / `./frontend` resolve correctly. Redeploying later
(pull latest + rebuild) is just Portainer's "Pull and redeploy" button.

**Option B — build once over SSH, then paste plain YAML.** If you'd rather
not give Portainer repo access:
```bash
ssh ep@192.168.1.232
git clone <this-repo-url> /opt/docker-data/wellness/src
cd /opt/docker-data/wellness/src/wellness-app
docker compose -f docker-compose.portainer.yml build
```
Then in Portainer → Stacks → Add stack → **Web editor**, paste
`docker-compose.portainer.yml` but replace the two `build:` blocks with
`image: wellness-app-wellness-backend` / `image: wellness-app-wellness-frontend`
(check the exact tags `docker images` gives the two you just built). You'll
need to repeat the `docker compose build` step over SSH whenever the source
changes, then redeploy the stack in Portainer.

## Environment variables (set in Portainer's stack editor, not a `.env` file)

| name | value |
|---|---|
| `DOCKER_DATA` | `/opt/docker-data` (same as every other stack) |
| `WELLNESS_DB_PASSWORD` | new strong password — this is a fresh Postgres instance, unrelated to `lampdb`/`nextcloud`'s MariaDB |
| `WELLNESS_JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `WELLNESS_JWT_REFRESH_SECRET` | a **different** `openssl rand -hex 32` |
| `WELLNESS_PUBLIC_ORIGIN` | `https://wellness.home` (or whatever domain you pick below) |
| `WELLNESS_AI_PROVIDER` | `disabled` to start; `openai` or `ollama` once you're ready (see main README) |
| `WELLNESS_OPENAI_API_KEY` | only if using `openai` |

Leave `WELLNESS_DB_USER` / `WELLNESS_DB_NAME` / `WELLNESS_SINGLE_USER_MODE`
unset unless you want to override their defaults (`wellness` / `wellness` /
`true`) — the compose file falls back to those automatically, the same way
your other stacks' optional vars work.

Deploy the stack. Before wiring up NPM, sanity-check it's actually healthy:

```bash
docker ps --filter name=wellness
docker exec wellness-backend wget -qO- http://localhost:4000/api/health
```

## Wiring it into Nginx Proxy Manager

Same pattern as `vault.home`:

1. NPM (`http://192.168.1.232:81`) → **Proxy Hosts** → **Add Proxy Host**
   - Domain Names: `wellness.home`
   - Scheme: `http`, Forward Hostname/IP: `wellness-frontend`, Forward Port: `3000`
   - Enable **Websockets Support**
2. **Custom Locations** tab on the same proxy host → add one:
   - Location: `/api`
   - Scheme: `http`, Forward Hostname/IP: `wellness-backend`, Forward Port: `4000`
3. **SSL** tab → since `.home` isn't a real public domain, Let's Encrypt's
   HTTP challenge won't work here either — use NPM's **self-signed**
   certificate option (same as vault.home), then force SSL.
4. On any client machine that needs to reach it, add a hosts-file entry
   the same way you did for vault.home — Pi-hole network-wide DNS is still
   parked, so `.home` names don't resolve automatically yet:
   ```
   192.168.1.232  wellness.home
   ```
5. For phone/remote access, use the Tailscale IP the same way you flagged
   for verifying the Bitwarden app.

Once that's in place, `https://wellness.home` is the app. Cookies are
`Secure` + `SameSite=Strict`, which is why `WELLNESS_PUBLIC_ORIGIN` must
exactly match the HTTPS origin the browser actually uses — if you pick a
different domain than `wellness.home`, update that variable to match.

## Backups

`scripts/backup.sh`/`restore.sh` assume the standalone compose file's
service name (`postgres`) and a local `.env`. On cerberus, back up the
same way you handle everything else under `DOCKER_DATA` — `/opt/docker-data/wellness/postgres`
is the data directory. A dump via the actual container name works the same way:

```bash
docker exec wellness-postgres pg_dump -U wellness -d wellness --no-owner --clean --if-exists \
  | gzip > /opt/docker-data/wellness/backups/wellness_$(date +%Y%m%d_%H%M%S).sql.gz
```

Worth adding a Uptime Kuma monitor for `wellness-backend`'s `/api/health`
once it's live, matching the rest of the box.
