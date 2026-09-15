CREATE TABLE IF NOT EXISTS "Environments" (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INTEGER NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Type" VARCHAR(20) NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CK_Environments_Type" CHECK ("Type" IN ('Development', 'Staging', 'Production')),
    CONSTRAINT "UQ_Environments_Project_Type" UNIQUE ("ProjectId", "Type")
);

CREATE INDEX IF NOT EXISTS "IX_Environments_ProjectId" ON "Environments" ("ProjectId");
