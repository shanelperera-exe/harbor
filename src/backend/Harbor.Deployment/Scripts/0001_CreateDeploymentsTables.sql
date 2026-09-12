CREATE TABLE IF NOT EXISTS "Deployments" (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INTEGER NOT NULL,
    "OwnerId" INTEGER NOT NULL,
    "Environment" VARCHAR(100) NOT NULL,
    "Version" VARCHAR(200) NOT NULL,
    "CommitSha" VARCHAR(100),
    "Status" VARCHAR(30) NOT NULL,
    "StartedAt" TIMESTAMPTZ NOT NULL,
    "CompletedAt" TIMESTAMPTZ,
    "FailureReason" TEXT
);

CREATE INDEX IF NOT EXISTS "IX_Deployments_Owner_Project_StartedAt"
    ON "Deployments" ("OwnerId", "ProjectId", "StartedAt" DESC);

CREATE TABLE IF NOT EXISTS "DeploymentLogs" (
    "Id" SERIAL PRIMARY KEY,
    "DeploymentId" INTEGER NOT NULL REFERENCES "Deployments"("Id") ON DELETE CASCADE,
    "Timestamp" TIMESTAMPTZ NOT NULL,
    "Level" VARCHAR(20) NOT NULL,
    "Message" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "IX_DeploymentLogs_Deployment_Timestamp"
    ON "DeploymentLogs" ("DeploymentId", "Timestamp", "Id");
