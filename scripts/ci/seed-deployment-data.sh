#!/usr/bin/env bash
# Seeds the data that the Deployments E2E tests (tests/Harbor.E2ETests/Tests/DeploymentsTests.cs)
# depend on. Locally this data was created by hand with psql - this script reproduces the same
# shape so CI's freshly-migrated Postgres has it too.
#
# Requires: curl, jq, and either:
#   - docker (with a named Postgres container running), or
#   - a system psql binary reachable at $POSTGRES_HOST:$POSTGRES_PORT
# and the Authentication service reachable at $AUTH_URL.
#
# Env vars (with CI defaults):
#   AUTH_URL            (default http://localhost:5196)
#   POSTGRES_CONTAINER  set to a container name to use docker exec; leave empty to use system psql
#   POSTGRES_HOST       (default localhost)   used only when POSTGRES_CONTAINER is empty
#   POSTGRES_PORT       (default 5432)        used only when POSTGRES_CONTAINER is empty
#   POSTGRES_USER       (default harboruser)
#   POSTGRES_PASSWORD   (default harborpass)  used only when POSTGRES_CONTAINER is empty
#   POSTGRES_DATABASE   (default harbor_db)

set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:5196}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-harbor-postgres}"
POSTGRES_USER="${POSTGRES_USER:-harboruser}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-harbor_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-harborpass}"

# run_psql <extra-psql-args...> — routes through docker exec when POSTGRES_CONTAINER
# is set (local dev / legacy docker-compose CI), otherwise uses the system psql binary
# directly (GitHub Actions service container, where Postgres is reachable on localhost).
run_psql() {
  if [ -n "$POSTGRES_CONTAINER" ]; then
    docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" "$@"
  else
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
      -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" "$@"
  fi
}


SEED_USERNAME="qa_tester2"
SEED_EMAIL="qa_tester2@harbor.local"
SEED_PASSWORD="Test@1234"

echo "Registering ${SEED_USERNAME} via ${AUTH_URL}/api/auth/register ..."

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${AUTH_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${SEED_USERNAME}\",\"email\":\"${SEED_EMAIL}\",\"password\":\"${SEED_PASSWORD}\"}")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" != "201" ]; then
  echo "Register call returned $HTTP_STATUS - assuming user already exists, looking it up instead."
  OWNER_ID=$(run_psql -t -A \
    -c "SELECT \"Id\" FROM \"Users\" WHERE \"Username\" = '${SEED_USERNAME}';")
else
  OWNER_ID=$(echo "$BODY" | jq -r '.data.id')
fi

if [ -z "$OWNER_ID" ] || [ "$OWNER_ID" == "null" ]; then
  echo "Could not determine OwnerId for ${SEED_USERNAME}. Register response was:"
  echo "$BODY"
  exit 1
fi

echo "Seeding deployment data for ${SEED_USERNAME} (OwnerId=${OWNER_ID}) ..."

# ON_ERROR_STOP is required: without it psql prints errors but still exits 0, so a
# broken INSERT (e.g. a column that no longer exists) silently seeds nothing and the
# Deployments E2E tests fail later with confusing "no rows" assertions.
run_psql -v ON_ERROR_STOP=1 <<SQL
-- Deployment history is queried through
--   d."ServiceId" IN (SELECT s."Id" FROM "Services" s JOIN "Projects" p ON s."ProjectId" = p."Id" WHERE p."OwnerId" = ...)
-- so every seeded Deployment must hang off a Service that belongs to a Project owned
-- by the seeded user. "Deployments" has no "ProjectId" column of its own.
DO \$\$
DECLARE
    v_project_id INTEGER;
    v_service_id INTEGER;
BEGIN
    SELECT "Id" INTO v_project_id FROM "Projects" WHERE "Name" = 'qa_seeded_project';
    IF v_project_id IS NULL THEN
        INSERT INTO "Projects" ("Name","Description","OwnerId","PublicId")
        VALUES ('qa_seeded_project','Seeded project for deployment history E2E tests',${OWNER_ID},'qa_seed_proj_001')
        RETURNING "Id" INTO v_project_id;
    END IF;

    SELECT "Id" INTO v_service_id FROM "Services" WHERE "ProjectId" = v_project_id;
    IF v_service_id IS NULL THEN
        INSERT INTO "Services" ("ProjectId","Name","Type","RepositoryName","RepositoryBranch","PublicId","WorkflowFile")
        VALUES (v_project_id,'qa_seeded_service','api','qa-seeded-service','main','qa_seed_svc_001','deploy.yml')
        RETURNING "Id" INTO v_service_id;
    END IF;
END
\$\$;

-- Make the script re-runnable: clear any previous seed rows (and their logs) first.
-- "Deployments"."PublicId" is uniquely indexed, so without this a second run aborts.
DELETE FROM "DeploymentLogs" WHERE "DeploymentId" IN (
    SELECT "Id" FROM "Deployments" WHERE "PublicId" LIKE 'qa_seed_dep_%'
);
DELETE FROM "Deployments" WHERE "PublicId" LIKE 'qa_seed_dep_%';

-- 29 varied background rows so filter/pagination tests have enough data
-- (mirrors the manually-seeded local dataset: mix of statuses/environments/versions).
INSERT INTO "Deployments" ("PublicId","ServiceId","OwnerId","Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason")
SELECT
    'qa_seed_dep_' || n,
    s."Id",
    ${OWNER_ID},
    (ARRAY['development','staging','production'])[1 + (n % 3)],
    '2.0.' || n,
    md5('seed-commit-' || n),
    (ARRAY['Succeeded','Failed','Running'])[1 + (n % 3)],
    NOW() - (n || ' hours')::interval,
    CASE WHEN (n % 3) <> 2 THEN NOW() - (n || ' hours')::interval + INTERVAL '5 minutes' ELSE NULL END,
    CASE WHEN (n % 3) = 1 THEN 'Seeded failure for automated test coverage.' ELSE NULL END
FROM generate_series(1, 29) AS n
JOIN "Services" s ON s."PublicId" = 'qa_seed_svc_001';

-- One specific Failed deployment with a real failure reason and real logs,
-- required by DeploymentsTests.DetailsPanel_WithPopulatedFailedDeployment_ShowsFailureReasonAndLogs.
WITH inserted AS (
    INSERT INTO "Deployments" ("PublicId","ServiceId","OwnerId","Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason")
    SELECT 'qa_seed_dep_failed', s."Id", ${OWNER_ID}, 'production', '2.1.0', 'f9a8b7c6d5e4', 'Failed',
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '4 minutes',
            'Container failed to start: exit code 137 (out of memory).'
    FROM "Services" s WHERE s."PublicId" = 'qa_seed_svc_001'
    RETURNING "Id"
)
INSERT INTO "DeploymentLogs" ("DeploymentId","Timestamp","Level","Message")
SELECT inserted."Id", ts, level, message
FROM inserted, (VALUES
    (NOW() - INTERVAL '3 hours', 'Info', 'Deployment started.'),
    (NOW() - INTERVAL '3 hours' + INTERVAL '1 minute', 'Info', 'Pulling container image.'),
    (NOW() - INTERVAL '3 hours' + INTERVAL '2 minutes', 'Warning', 'Memory usage approaching limit.'),
    (NOW() - INTERVAL '3 hours' + INTERVAL '4 minutes', 'Error', 'Container terminated unexpectedly (OOMKilled).')
) AS logs(ts, level, message);
SQL

echo "Deployment test data seeded successfully."
