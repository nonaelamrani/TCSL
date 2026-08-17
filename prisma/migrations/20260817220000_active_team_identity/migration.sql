-- Keep archived team identities for historical records, while preventing only
-- duplicate identities among active teams.
DROP INDEX "Team_name_key";
DROP INDEX "Team_discordRoleId_key";

CREATE UNIQUE INDEX "Team_active_name_key"
ON "Team" (LOWER("name"))
WHERE "isArchived" = false;

CREATE UNIQUE INDEX "Team_active_discordRoleId_key"
ON "Team" ("discordRoleId")
WHERE "isArchived" = false;
