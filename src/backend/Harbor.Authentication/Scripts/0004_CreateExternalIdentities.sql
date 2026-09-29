CREATE TABLE IF NOT EXISTS "ExternalIdentities" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Provider" VARCHAR(50) NOT NULL,
    "ProviderUserId" VARCHAR(255) NOT NULL,
    "ProviderEmail" VARCHAR(255) NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UQ_ExternalIdentities_ProviderSubject" UNIQUE ("Provider", "ProviderUserId"),
    CONSTRAINT "UQ_ExternalIdentities_UserProvider" UNIQUE ("UserId", "Provider")
);

INSERT INTO "ExternalIdentities" ("UserId", "Provider", "ProviderUserId", "ProviderEmail")
SELECT u."Id", lower(trim(method)), u."Email", u."Email"
FROM "Users" u
CROSS JOIN LATERAL unnest(string_to_array(u."ExternalLoginMethods", ',')) AS method
WHERE trim(method) <> ''
ON CONFLICT DO NOTHING;