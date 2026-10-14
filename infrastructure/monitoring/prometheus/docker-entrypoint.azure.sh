#!/bin/sh
# Harbor Prometheus entrypoint for Azure Container Apps.
# Renders runtime-only auth files from environment (ACA secrets) and fails closed
# if anything required is missing, so Prometheus never starts unauthenticated.
set -eu

fail() {
  echo "FATAL: $1" >&2
  exit 1
}

[ -n "${METRICS_SCRAPE_TOKEN:-}" ] || fail "METRICS_SCRAPE_TOKEN is required"
[ -n "${PROMETHEUS_BASIC_AUTH_USER:-}" ] || fail "PROMETHEUS_BASIC_AUTH_USER is required"
[ -n "${PROMETHEUS_BASIC_AUTH_BCRYPT:-}" ] || fail "PROMETHEUS_BASIC_AUTH_BCRYPT is required"

# Strict allow-lists keep the generated YAML well-formed (no injection via env values).
echo "$PROMETHEUS_BASIC_AUTH_USER" | grep -Eq '^[A-Za-z0-9._-]{3,64}$' \
  || fail "PROMETHEUS_BASIC_AUTH_USER must match [A-Za-z0-9._-]{3,64}"
echo "$PROMETHEUS_BASIC_AUTH_BCRYPT" | grep -Eq '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' \
  || fail "PROMETHEUS_BASIC_AUTH_BCRYPT must be a bcrypt hash"

RUNTIME_DIR=/tmp/prometheus-runtime
umask 077
mkdir -p "$RUNTIME_DIR"

printf '%s' "$METRICS_SCRAPE_TOKEN" > "$RUNTIME_DIR/scrape_token"
printf 'basic_auth_users:\n  %s: "%s"\n' \
  "$PROMETHEUS_BASIC_AUTH_USER" "$PROMETHEUS_BASIC_AUTH_BCRYPT" > "$RUNTIME_DIR/web.yml"

unset METRICS_SCRAPE_TOKEN PROMETHEUS_BASIC_AUTH_BCRYPT

# --web.enable-lifecycle and --web.enable-admin-api are intentionally NOT enabled.
exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.config.file="$RUNTIME_DIR/web.yml" \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time="${PROMETHEUS_RETENTION:-15d}" \
  --web.console.libraries=/usr/share/prometheus/console_libraries \
  --web.console.templates=/usr/share/prometheus/consoles \
  "$@"
