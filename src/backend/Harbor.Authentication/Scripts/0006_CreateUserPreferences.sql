CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "UserId" INTEGER PRIMARY KEY REFERENCES "Users"("Id") ON DELETE CASCADE,
    "DashboardTheme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "LogTheme" VARCHAR(30) NOT NULL DEFAULT 'match-dashboard',
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CK_UserPreferences_DashboardTheme" CHECK ("DashboardTheme" IN ('system', 'light', 'dark')),
    CONSTRAINT "CK_UserPreferences_LogTheme" CHECK ("LogTheme" IN ('match-dashboard', 'light', 'dark'))
);
