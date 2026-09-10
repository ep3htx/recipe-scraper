#!/usr/bin/env bash
# Run this ON cerberus itself (SSH in first) — it can't be run from anywhere
# else, since it needs the host's Docker daemon and its /opt/docker-data.
#
#   ssh ep@192.168.1.232
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<branch>/wellness-app/scripts/deploy-cerberus.sh | bash
#   # or, if you already have the repo cloned somewhere:
#   ./wellness-app/scripts/deploy-cerberus.sh
#
# What it does:
#   1. Clones/updates this repo under $DOCKER_DATA/wellness/src
#   2. Generates DB/JWT secrets once and reuses them on every re-run (a
#      fresh secret on redeploy would invalidate every logged-in session
#      and, for the DB password, break the existing database)
#   3. Builds and starts docker-compose.portainer.yml on the shared
#      `proxy` network, the same one every other stack on this box uses
#   4. Prints the exact next step: wiring wellness.home into Nginx Proxy
#      Manager (that part still has to happen in NPM's UI — this script
#      doesn't touch NPM).
#
# Safe to re-run: it reuses existing secrets/data and just rebuilds +
# redeploys the containers (e.g. after `git pull`-ing a newer version).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ep3htx/recipe-scraper.git}"
REPO_REF="${REPO_REF:-claude/wellness-dashboard-app-ralmn0}"
DOCKER_DATA="${DOCKER_DATA:-/opt/docker-data}"
SRC_DIR="$DOCKER_DATA/wellness/src"
SECRETS_FILE="$DOCKER_DATA/wellness/secrets.env"

if ! command -v docker >/dev/null; then
  echo "docker not found — this must run on cerberus, not wherever you're reading this from." >&2
  exit 1
fi

if ! docker network inspect proxy >/dev/null 2>&1; then
  echo "Docker network 'proxy' doesn't exist yet — the 'network' stack (NPM + Pi-hole) needs to be deployed first." >&2
  exit 1
fi

echo "==> Fetching source into $SRC_DIR"
mkdir -p "$DOCKER_DATA/wellness"
if [ -d "$SRC_DIR/.git" ]; then
  git -C "$SRC_DIR" fetch origin "$REPO_REF"
  git -C "$SRC_DIR" checkout "$REPO_REF"
  git -C "$SRC_DIR" reset --hard "origin/$REPO_REF"
else
  git clone --branch "$REPO_REF" "$REPO_URL" "$SRC_DIR"
fi

echo "==> Preparing data directories"
mkdir -p "$DOCKER_DATA/wellness/postgres" "$DOCKER_DATA/wellness/uploads"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "==> Generating secrets (first run) at $SECRETS_FILE"
  umask 077
  {
    echo "WELLNESS_DB_PASSWORD=$(openssl rand -hex 20)"
    echo "WELLNESS_JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
    echo "WELLNESS_JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
  } > "$SECRETS_FILE"
else
  echo "==> Reusing existing secrets from $SECRETS_FILE"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"
export WELLNESS_DB_PASSWORD WELLNESS_JWT_ACCESS_SECRET WELLNESS_JWT_REFRESH_SECRET
export DOCKER_DATA
export WELLNESS_PUBLIC_ORIGIN="${WELLNESS_PUBLIC_ORIGIN:-https://wellness.home}"
export WELLNESS_AI_PROVIDER="${WELLNESS_AI_PROVIDER:-disabled}"

cd "$SRC_DIR/wellness-app"
echo "==> Building and starting the stack (this takes a few minutes the first time)"
docker compose -f docker-compose.portainer.yml --project-name wellness up -d --build

echo "==> Waiting for the backend to report healthy..."
for _ in $(seq 1 30); do
  if docker exec wellness-backend wget -qO- http://localhost:4000/api/health >/dev/null 2>&1; then
    echo "Backend is healthy."
    break
  fi
  sleep 2
done

cat <<EOF

==> Done. Containers running:
$(docker ps --filter name=wellness --format '    {{.Names}}: {{.Status}}')

Next step (not automated by this script) — wire it into Nginx Proxy
Manager, same pattern as vault.home:
  1. http://192.168.1.232:81 -> Proxy Hosts -> Add Proxy Host
     Domain: wellness.home -> wellness-frontend:3000 (enable Websockets)
  2. Custom Locations -> /api -> wellness-backend:4000
  3. SSL tab -> self-signed certificate, force SSL
  4. Add "192.168.1.232 wellness.home" to your hosts file on whatever
     machine you browse from (Pi-hole DNS is still parked, per the infra doc)

Then visit https://wellness.home and register — first account only,
SINGLE_USER_MODE is on.

Secrets live at $SECRETS_FILE (root-readable only) — back that file up
alongside $DOCKER_DATA/wellness/postgres; losing it means losing DB access.
EOF
