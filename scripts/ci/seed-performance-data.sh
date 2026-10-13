#!/usr/bin/env bash
# Seeds a deployment with ~2000 log rows for US-19 performance testing.
#
# Requires: curl, jq, docker (with harbor-postgres container running),
# and the Authentication service reachable at $AUTH_URL.
#
# Pre-condition: scripts/ci/seed-deployment-data.sh must have run first
# (creates qa_seeded_project and qa_seed_svc_001).

set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:5196}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-harbor-postgres}"
POSTGRES_USER="${POSTGRES_USER:-harboruser}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-harbor_db}"

echo "Looking up qa_tester2..."

# The user should already exist from seed-deployment-data.sh; look them up directly.
OWNER_ID=$(docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -t -A \
  -c "SELECT \"Id\" FROM \"Users\" WHERE \"Username\" = 'qa_tester2';")

if [ -z "$OWNER_ID" ]; then
  echo "qa_tester2 not found - run scripts/ci/seed-deployment-data.sh first."
  exit 1
fi

echo "Seeding performance test data for qa_tester2 (OwnerId=${OWNER_ID}) ..."

docker exec -i "$POSTGRES_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" <<SQL
DO \$\$
DECLARE
    v_service_id INTEGER;
    v_deployment_id INTEGER;
BEGIN
    SELECT "Id" INTO v_service_id FROM "Services" WHERE "PublicId" = 'qa_seed_svc_001';
    IF v_service_id IS NULL THEN
        RAISE EXCEPTION 'qa_seed_svc_001 not found - run seed-deployment-data.sh first.';
    END IF;

    -- Re-runnable: clear any previous performance seed rows (and their logs) first.
    DELETE FROM "DeploymentLogs" WHERE "DeploymentId" IN (
        SELECT "Id" FROM "Deployments" WHERE "PublicId" = 'qa_seed_dep_perf_large'
    );
    DELETE FROM "Deployments" WHERE "PublicId" = 'qa_seed_dep_perf_large';

    INSERT INTO "Deployments" ("PublicId","ServiceId","OwnerId","Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason")
    VALUES ('qa_seed_dep_perf_large', v_service_id, ${OWNER_ID}, 'production', 'perf-large', 'abc1234', 'Failed',
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '5 minutes',
            'Performance test deployment with 2000 log rows.')
    RETURNING "Id" INTO v_deployment_id;

    INSERT INTO "DeploymentLogs" ("DeploymentId","Timestamp","Level","Message")
    SELECT v_deployment_id,
           NOW() - INTERVAL '1 hour' + (n || ' seconds')::interval,
           CASE WHEN n % 10 = 0 THEN 'Error' ELSE 'Info' END,
           'Log line ' || LPAD(n::text, 4, '0') || ' - simulating deployment output for performance testing'
    FROM generate_series(1, 2000) AS n;
END
\$\$;
SQL

echo "Performance test data seeded successfully (2000 log rows)."
