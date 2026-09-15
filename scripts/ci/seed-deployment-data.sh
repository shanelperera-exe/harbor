#!/usr/bin/env bash
# Seeds the data that the Deployments E2E tests (tests/Harbor.E2ETests/Tests/DeploymentsTests.cs)
# depend on. Locally this data was created by hand with psql - this script reproduces the same
# shape so CI's freshly-migrated Postgres has it too.
#
# Requires: curl, jq, docker (with the harbor-postgres container already running),
# and the Authentication service reachable at $AUTH_URL.
#
# Env vars (with CI defaults matching .github/workflows/ci.yml):
#   AUTH_URL            (default http://localhost:5196)
#   POSTGRES_CONTAINER  (default harbor-postgres)
#   POSTGRES_USER       (default harboruser)
#   POSTGRES_DATABASE   (default harbor_db)

set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:5196}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-harbor-postgres}"
POSTGRES_USER="${POSTGRES_USER:-harboruser}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-harbor_db}"

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
  OWNER_ID=$(docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -A \
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

docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" <<SQL
-- 29 varied background rows so filter/pagination tests have enough data
-- (mirrors the manually-seeded local dataset: mix of statuses/environments/versions).
INSERT INTO "Deployments" ("ProjectId","OwnerId","Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason")
SELECT
    1,
    ${OWNER_ID},
    (ARRAY['development','staging','production'])[1 + (n % 3)],
    '2.0.' || n,
    md5('seed-commit-' || n),
    (ARRAY['Succeeded','Failed','Running'])[1 + (n % 3)],
    NOW() - (n || ' hours')::interval,
    CASE WHEN (n % 3) <> 2 THEN NOW() - (n || ' hours')::interval + INTERVAL '5 minutes' ELSE NULL END,
    CASE WHEN (n % 3) = 1 THEN 'Seeded failure for automated test coverage.' ELSE NULL END
FROM generate_series(1, 29) AS n;

-- One specific Failed deployment with a real failure reason and real logs,
-- required by DeploymentsTests.DetailsPanel_WithPopulatedFailedDeployment_ShowsFailureReasonAndLogs.
WITH inserted AS (
    INSERT INTO "Deployments" ("ProjectId","OwnerId","Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason")
    VALUES (1, ${OWNER_ID}, 'production', '2.1.0', 'f9a8b7c6d5e4', 'Failed',
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '4 minutes',
            'Container failed to start: exit code 137 (out of memory).')
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
