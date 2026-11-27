#!/usr/bin/env bash
# Seeds the data that the Deployments, Reporting, and Notification E2E tests
# depend on across harbor_auth, harbor_project, harbor_deploy, and harbor_reporting.
#
# Requires: curl, jq, and either:
#   - docker (with a named Postgres container running), or
#   - a system psql binary reachable at $POSTGRES_HOST:$POSTGRES_PORT
# and the Authentication service reachable at $AUTH_URL.
#
# Env vars (with CI defaults):
#   AUTH_URL                    (default http://localhost:5196)
#   POSTGRES_CONTAINER          set to a container name to use docker exec; leave empty to use system psql
#   POSTGRES_HOST               (default localhost)   used only when POSTGRES_CONTAINER is empty
#   POSTGRES_PORT               (default 5432)        used only when POSTGRES_CONTAINER is empty
#   POSTGRES_USER               (default harboruser)
#   POSTGRES_PASSWORD           (default harborpass)  used only when POSTGRES_CONTAINER is empty
#   AUTH_POSTGRES_DATABASE      (default harbor_auth)
#   PROJECT_POSTGRES_DATABASE   (default harbor_project)
#   DEPLOY_POSTGRES_DATABASE    (default harbor_deploy)
#   REPORTING_POSTGRES_DATABASE (default harbor_reporting)

set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:5196}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER-harbor-postgres}"
POSTGRES_USER="${POSTGRES_USER:-harboruser}"
AUTH_POSTGRES_DATABASE="${AUTH_POSTGRES_DATABASE:-harbor_auth}"
PROJECT_POSTGRES_DATABASE="${PROJECT_POSTGRES_DATABASE:-harbor_project}"
DEPLOY_POSTGRES_DATABASE="${DEPLOY_POSTGRES_DATABASE:-${POSTGRES_DATABASE:-harbor_deploy}}"
REPORTING_POSTGRES_DATABASE="${REPORTING_POSTGRES_DATABASE:-harbor_reporting}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-harborpass}"

run_psql_db() {
  local database="$1"
  shift
  if [ -n "$POSTGRES_CONTAINER" ]; then
    docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$database" "$@"
  else
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
      -U "$POSTGRES_USER" -d "$database" "$@"
  fi
}

register_or_lookup_user() {
  local username="$1"
  local email="$2"
  local password="$3"

  echo "Registering ${username} via ${AUTH_URL}/api/auth/register ..." >&2

  local response http_status body user_id
  response=$(curl -s -w "\n%{http_code}" -X POST "${AUTH_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"email\":\"${email}\",\"password\":\"${password}\"}")

  http_status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_status" != "201" ]; then
    echo "Register call for ${username} returned ${http_status} - assuming user already exists, looking it up instead." >&2
    user_id=$(run_psql_db "$AUTH_POSTGRES_DATABASE" -t -A \
      -c "SELECT \"Id\" FROM \"Users\" WHERE \"Username\" = '${username}';")
  else
    user_id=$(echo "$body" | jq -r '.data.id')
  fi

  if [ -z "$user_id" ] || [ "$user_id" == "null" ]; then
    echo "Could not determine user id for ${username}. Register response was:" >&2
    echo "$body" >&2
    exit 1
  fi

  echo "$user_id"
}

SEED_USERNAME="qa_tester2"
SEED_EMAIL="qa_tester2@harbor.local"
SEED_PASSWORD="Test@1234"

SEED_USERNAME_2="qa_tester3"
SEED_EMAIL_2="qa_tester3@harbor.local"
SEED_PASSWORD_2="Test@1234"

OWNER_ID=$(register_or_lookup_user "$SEED_USERNAME" "$SEED_EMAIL" "$SEED_PASSWORD")
OWNER2_ID=$(register_or_lookup_user "$SEED_USERNAME_2" "$SEED_EMAIL_2" "$SEED_PASSWORD_2")

echo "Seeding projects & services in ${PROJECT_POSTGRES_DATABASE} for ${SEED_USERNAME} (OwnerId=${OWNER_ID}) ..."

# ON_ERROR_STOP is required: without it psql prints errors but still exits 0.
run_psql_db "$PROJECT_POSTGRES_DATABASE" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO "Projects" ("Name","Description","OwnerId","PublicId")
VALUES ('qa_seeded_project','Seeded project for deployment history E2E tests',${OWNER_ID},'qa_seed_proj_001')
ON CONFLICT ("PublicId") DO UPDATE SET "Name"=EXCLUDED."Name", "OwnerId"=EXCLUDED."OwnerId", "IsArchived"=FALSE;

INSERT INTO "Projects" ("Name","Description","OwnerId","PublicId")
VALUES ('Project Alpha','Alpha project for deployment report tests',${OWNER_ID},'qa_seed_proj_alpha')
ON CONFLICT ("PublicId") DO UPDATE SET "Name"=EXCLUDED."Name", "OwnerId"=EXCLUDED."OwnerId", "IsArchived"=FALSE;

INSERT INTO "Services" ("ProjectId","Name","Type","RepositoryName","RepositoryBranch","PublicId","WorkflowFile")
SELECT p."Id",'qa_seeded_service','api','qa-seeded-service','main','qa_seed_svc_001','deploy.yml'
FROM "Projects" p WHERE p."PublicId"='qa_seed_proj_001'
ON CONFLICT ("PublicId") DO UPDATE SET "ProjectId"=EXCLUDED."ProjectId", "Name"=EXCLUDED."Name";

INSERT INTO "Services" ("ProjectId","Name","Type","RepositoryName","RepositoryBranch","PublicId","WorkflowFile")
SELECT p."Id",'Alpha Service','api','alpha-service','main','qa_seed_svc_alpha','deploy.yml'
FROM "Projects" p WHERE p."PublicId"='qa_seed_proj_alpha'
ON CONFLICT ("PublicId") DO UPDATE SET "ProjectId"=EXCLUDED."ProjectId", "Name"=EXCLUDED."Name";
SQL

PROJ_SEED_ID=$(run_psql_db "$PROJECT_POSTGRES_DATABASE" -t -A -c "SELECT \"Id\" FROM \"Projects\" WHERE \"PublicId\" = 'qa_seed_proj_001';")
SVC_SEED_ID=$(run_psql_db "$PROJECT_POSTGRES_DATABASE" -t -A -c "SELECT \"Id\" FROM \"Services\" WHERE \"PublicId\" = 'qa_seed_svc_001';")
PROJ_ALPHA_ID=$(run_psql_db "$PROJECT_POSTGRES_DATABASE" -t -A -c "SELECT \"Id\" FROM \"Projects\" WHERE \"PublicId\" = 'qa_seed_proj_alpha';")
SVC_ALPHA_ID=$(run_psql_db "$PROJECT_POSTGRES_DATABASE" -t -A -c "SELECT \"Id\" FROM \"Services\" WHERE \"PublicId\" = 'qa_seed_svc_alpha';")

echo "Resolved IDs: qa_seeded_project=${PROJ_SEED_ID} (svc=${SVC_SEED_ID}), Project Alpha=${PROJ_ALPHA_ID} (svc=${SVC_ALPHA_ID})"
echo "Seeding deployments & notifications in ${DEPLOY_POSTGRES_DATABASE} ..."

run_psql_db "$DEPLOY_POSTGRES_DATABASE" -v ON_ERROR_STOP=1 <<SQL
-- Populate ServiceCatalogCache with the exact Project/Service IDs from harbor_project
-- so Harbor.Deployment queries resolve ProjectId, ProjectName, ServiceName, and OwnerId consistently.
INSERT INTO "ServiceCatalogCache" (
    "ServiceId","ServicePublicId","ProjectId","ProjectPublicId",
    "ServiceName","ServiceType","ProjectName","OwnerId","OwnerName",
    "IsArchived","RepositoryName","RepositoryBranch","WorkflowFile"
)
VALUES
    (${SVC_SEED_ID},'qa_seed_svc_001',${PROJ_SEED_ID},'qa_seed_proj_001','qa_seeded_service','api','qa_seeded_project',${OWNER_ID},'${SEED_USERNAME}',FALSE,'qa-seeded-service','main','deploy.yml'),
    (${SVC_ALPHA_ID},'qa_seed_svc_alpha',${PROJ_ALPHA_ID},'qa_seed_proj_alpha','Alpha Service','api','Project Alpha',${OWNER_ID},'${SEED_USERNAME}',FALSE,'alpha-service','main','deploy.yml')
ON CONFLICT ("ServiceId") DO UPDATE SET
    "ServicePublicId"=EXCLUDED."ServicePublicId",
    "ProjectId"=EXCLUDED."ProjectId",
    "ProjectPublicId"=EXCLUDED."ProjectPublicId",
    "ServiceName"=EXCLUDED."ServiceName",
    "ServiceType"=EXCLUDED."ServiceType",
    "ProjectName"=EXCLUDED."ProjectName",
    "OwnerId"=EXCLUDED."OwnerId",
    "OwnerName"=EXCLUDED."OwnerName",
    "IsArchived"=FALSE,
    "UpdatedAt"=NOW();

-- Make the script re-runnable: clear any previous seed notifications, logs, and deployments first.
DELETE FROM "Notifications" WHERE "UserId" IN (${OWNER_ID}, ${OWNER2_ID}) AND "DeploymentId" IS NOT NULL;
DELETE FROM "DeploymentLogs" WHERE "DeploymentId" IN (
    SELECT "Id" FROM "Deployments" WHERE "PublicId" LIKE 'qa_seed_dep_%'
);
DELETE FROM "Deployments" WHERE "PublicId" LIKE 'qa_seed_dep_%';

-- 29 varied background rows so filter/pagination tests have enough data.
-- No Running deployments are included: StatusFilter_SelectingStatus_Running_NoResults expects 0 Running rows.
INSERT INTO "Deployments" (
    "PublicId","ServiceId","ProjectId","OwnerId",
    "ProjectName","ServiceName","OwnerName",
    "Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason"
)
SELECT
    'qa_seed_dep_' || n,
    ${SVC_SEED_ID},
    ${PROJ_SEED_ID},
    ${OWNER_ID},
    'qa_seeded_project',
    'qa_seeded_service',
    '${SEED_USERNAME}',
    (ARRAY['development','staging','production'])[1 + (n % 3)],
    '2.0.' || n,
    md5('seed-commit-' || n),
    (ARRAY['Succeeded','Failed'])[1 + (n % 2)],
    NOW() - (n || ' hours')::interval,
    CASE WHEN (n % 2) = 0 THEN NOW() - (n || ' hours')::interval + INTERVAL '5 minutes' ELSE NULL END,
    CASE WHEN (n % 2) = 1 THEN 'GitHub Actions is not configured for this repository.' ELSE NULL END
FROM generate_series(1, 29) AS n;

-- Additional deployments for Project Alpha / Alpha Service (for DeploymentReportTests)
INSERT INTO "Deployments" (
    "PublicId","ServiceId","ProjectId","OwnerId",
    "ProjectName","ServiceName","OwnerName",
    "Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason"
)
SELECT
    'qa_seed_dep_alpha_' || n,
    ${SVC_ALPHA_ID},
    ${PROJ_ALPHA_ID},
    ${OWNER_ID},
    'Project Alpha',
    'Alpha Service',
    '${SEED_USERNAME}',
    (ARRAY['development','staging','production'])[1 + (n % 3)],
    '1.0.' || n,
    md5('alpha-commit-' || n),
    (ARRAY['Succeeded','Failed'])[1 + (n % 2)],
    NOW() - (n || ' hours')::interval,
    CASE WHEN (n % 2) = 0 THEN NOW() - (n || ' hours')::interval + INTERVAL '5 minutes' ELSE NULL END,
    CASE WHEN (n % 2) = 1 THEN 'GitHub Actions is not configured for this repository.' ELSE NULL END
FROM generate_series(1, 10) AS n;

-- Specific Failed deployment with a failure reason and real logs,
-- required by DeploymentsTests.DeploymentDetails_WithPopulatedFailedDeployment_ShowsFailureReasonAndLogs.
WITH inserted AS (
    INSERT INTO "Deployments" (
        "PublicId","ServiceId","ProjectId","OwnerId",
        "ProjectName","ServiceName","OwnerName",
        "Environment","Version","CommitSha","Status","StartedAt","CompletedAt","FailureReason"
    )
    VALUES (
        'qa_seed_dep_failed', ${SVC_SEED_ID}, ${PROJ_SEED_ID}, ${OWNER_ID},
        'qa_seeded_project', 'qa_seeded_service', '${SEED_USERNAME}',
        'production', '2.1.0', 'f9a8b7c6d5e4', 'Failed',
        NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '4 minutes',
        'GitHub Actions is not configured for this repository.'
    )
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

-- Seed notifications for qa_tester2 (mix of success & failure)
WITH deployments AS (
    SELECT d."Id", d."Status", d."Environment", d."Version", d."ServiceName"
    FROM "Deployments" d
    WHERE d."PublicId" LIKE 'qa_seed_dep_%'
    ORDER BY d."Id" ASC
    LIMIT 10
)
INSERT INTO "Notifications" ("UserId", "DeploymentId", "Type", "Title", "Message")
SELECT
    ${OWNER_ID},
    d."Id",
    CASE
        WHEN d."Status" = 'Succeeded' THEN 'success'
        ELSE 'failure'
    END,
    CASE
        WHEN d."Status" = 'Succeeded' THEN 'Deployment succeeded — ' || d."ServiceName"
        ELSE 'Deployment failed — ' || d."ServiceName"
    END,
    CASE
        WHEN d."Status" = 'Succeeded'
        THEN 'Version ' || d."Version" || ' deployed successfully to ' || d."Environment" || '.'
        ELSE 'Version ' || d."Version" || ' failed to deploy to ' || d."Environment" || '. Reason: GitHub Actions is not configured for this repository.'
    END
FROM deployments d;

WITH failed_dep AS (
    SELECT d."Id", d."Environment", d."Version", d."ServiceName"
    FROM "Deployments" d
    WHERE d."PublicId" = 'qa_seed_dep_failed'
)
INSERT INTO "Notifications" ("UserId", "DeploymentId", "Type", "Title", "Message")
SELECT
    ${OWNER_ID},
    f."Id",
    'failure',
    'Deployment failed — ' || f."ServiceName",
    'Version ' || f."Version" || ' failed to deploy to ' || f."Environment" || '. Reason: GitHub Actions is not configured for this repository.'
FROM failed_dep f;

-- Seed 1 notification for qa_tester3 (for E2E_07_UserNotificationIsolation_Works)
WITH dep1 AS (
    SELECT d."Id", d."Environment", d."Version", d."ServiceName"
    FROM "Deployments" d
    WHERE d."PublicId" = 'qa_seed_dep_1'
)
INSERT INTO "Notifications" ("UserId", "DeploymentId", "Type", "Title", "Message")
SELECT
    ${OWNER2_ID},
    d."Id",
    'success',
    'Deployment succeeded — ' || d."ServiceName",
    'Version ' || d."Version" || ' deployed successfully to ' || d."Environment" || '.'
FROM dep1 d;

-- Mark first 3 notifications as unread for qa_tester2
UPDATE "Notifications"
SET "IsRead" = false
WHERE "UserId" = ${OWNER_ID}
  AND "Id" IN (
    SELECT "Id" FROM "Notifications"
    WHERE "UserId" = ${OWNER_ID}
    ORDER BY "CreatedAt" DESC
    LIMIT 3
  );
SQL

echo "Seeding reporting read models in ${REPORTING_POSTGRES_DATABASE} ..."

run_psql_db "$REPORTING_POSTGRES_DATABASE" -v ON_ERROR_STOP=1 \
  -c "DELETE FROM \"DeploymentReadModels\" WHERE \"PublicId\" LIKE 'qa_seed_dep_%';"

run_psql_db "$DEPLOY_POSTGRES_DATABASE" -v ON_ERROR_STOP=1 -c "
COPY (
    SELECT
        \"Id\",
        \"PublicId\",
        \"ServiceId\",
        COALESCE(\"ProjectId\", 0),
        \"OwnerId\",
        \"ProjectName\",
        \"ServiceName\",
        \"OwnerName\",
        \"Environment\",
        \"Version\",
        \"CommitSha\",
        \"CommitMessage\",
        \"Status\",
        \"StartedAt\",
        \"CompletedAt\",
        \"FailureReason\"
    FROM \"Deployments\"
    WHERE \"PublicId\" LIKE 'qa_seed_dep_%'
) TO STDOUT
" | run_psql_db "$REPORTING_POSTGRES_DATABASE" -v ON_ERROR_STOP=1 -c "
COPY \"DeploymentReadModels\" (
    \"Id\",
    \"PublicId\",
    \"ServiceId\",
    \"ProjectId\",
    \"OwnerId\",
    \"ProjectName\",
    \"ServiceName\",
    \"UserName\",
    \"Environment\",
    \"Version\",
    \"CommitSha\",
    \"CommitMessage\",
    \"Status\",
    \"StartedAt\",
    \"CompletedAt\",
    \"FailureReason\"
) FROM STDIN
"

echo "All E2E test data (auth, projects, deployments, notifications, reports) seeded successfully."
