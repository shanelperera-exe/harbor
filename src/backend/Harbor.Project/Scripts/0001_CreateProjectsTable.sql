CREATE TABLE IF NOT EXISTS "Projects" (
    "Id"             SERIAL PRIMARY KEY,
    "Name"           VARCHAR(100)  NOT NULL,
    "Description"    VARCHAR(500)  NULL,
    "RepositoryUrl"  VARCHAR(500)  NULL,
    "OwnerId"        INTEGER       NOT NULL,
    "CreatedAt"      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_Projects_OwnerId" ON "Projects" ("OwnerId");