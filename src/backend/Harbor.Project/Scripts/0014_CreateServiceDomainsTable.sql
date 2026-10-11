CREATE TABLE IF NOT EXISTS "ServiceDomains" (
    "Id" SERIAL PRIMARY KEY,
    "ServiceId" INTEGER NOT NULL REFERENCES "Services"("Id") ON DELETE CASCADE,
    "Domain" VARCHAR(255) NOT NULL,
    "Environment" VARCHAR(50) NOT NULL DEFAULT 'Production',
    "IsPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsSystem" BOOLEAN NOT NULL DEFAULT FALSE,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "DnsType" VARCHAR(10) NOT NULL DEFAULT 'CNAME',
    "DnsHost" VARCHAR(100) NOT NULL DEFAULT '@',
    "DnsTarget" VARCHAR(255) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "VerifiedAt" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_ServiceDomains_ServiceId_Domain"
ON "ServiceDomains" ("ServiceId", "Domain");

CREATE INDEX IF NOT EXISTS "IX_ServiceDomains_ServiceId"
ON "ServiceDomains" ("ServiceId");
