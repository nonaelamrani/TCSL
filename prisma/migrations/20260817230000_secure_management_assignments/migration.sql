-- Staff relationships remain available in archived team history, but must be
-- unique among active teams only.
DROP INDEX "Team_managerId_key";
DROP INDEX "Team_assistantManagerId_key";

CREATE UNIQUE INDEX "Team_active_managerId_key"
ON "Team" ("managerId")
WHERE "isArchived" = false AND "managerId" IS NOT NULL;

CREATE UNIQUE INDEX "Team_active_assistantManagerId_key"
ON "Team" ("assistantManagerId")
WHERE "isArchived" = false AND "assistantManagerId" IS NOT NULL;

ALTER TABLE "Team"
ADD CONSTRAINT "Team_distinct_management_staff"
CHECK ("managerId" IS NULL OR "assistantManagerId" IS NULL OR "managerId" <> "assistantManagerId");
