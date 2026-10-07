CREATE TABLE IF NOT EXISTS "Notifications" (
    "Id"           SERIAL PRIMARY KEY,
    "UserId"       INTEGER      NOT NULL,
    "DeploymentId" INTEGER      NOT NULL REFERENCES "Deployments"("Id") ON DELETE CASCADE,
    "Type"         VARCHAR(20)  NOT NULL,   -- 'success' | 'failure'
    "Title"        VARCHAR(200) NOT NULL,
    "Message"      TEXT         NOT NULL,
    "IsRead"       BOOLEAN      NOT NULL DEFAULT FALSE,
    "CreatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IX_Notifications_User_CreatedAt"
    ON "Notifications" ("UserId", "CreatedAt" DESC);

CREATE INDEX IF NOT EXISTS "IX_Notifications_User_IsRead"
    ON "Notifications" ("UserId", "IsRead");
