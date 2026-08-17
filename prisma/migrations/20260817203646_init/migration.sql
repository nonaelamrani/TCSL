-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'POSTPONEMENT_PENDING', 'POSTPONED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostponementStatus" AS ENUM ('PENDING', 'STAFF_APPROVED', 'STAFF_DENIED', 'OPPONENT_PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'STAFF_INTERVENTION');

-- CreateEnum
CREATE TYPE "PostponementActionType" AS ENUM ('REQUESTED', 'STAFF_APPROVED', 'STAFF_DENIED', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('TRANSFER', 'RELEASE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('TEAM_CREATED', 'TEAM_UPDATED', 'TEAM_DELETED', 'MANAGER_ASSIGNED', 'ASSISTANT_ASSIGNED', 'SACKED', 'OFFER_CREATED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'PLAYER_RELEASED', 'DEMAND_CREATED', 'MATCH_CREATED', 'POSTPONEMENT_REQUESTED', 'CONFIGURATION_CHANGED');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discordRoleId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "managerId" TEXT,
    "assistantManagerId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "discordId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "offeringTeamId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "toTeamId" TEXT,
    "type" "TransferType" NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DemandStatus" NOT NULL DEFAULT 'PENDING',
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "originalTimestamp" TIMESTAMP(3) NOT NULL,
    "currentTimestamp" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postponement" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "requestingTeamId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "proposedTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PostponementStatus" NOT NULL DEFAULT 'PENDING',
    "caseId" TEXT NOT NULL,
    "counterOfferCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postponement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostponementAction" (
    "id" TEXT NOT NULL,
    "postponementId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "PostponementActionType" NOT NULL,
    "proposedTime" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostponementAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "teamId" TEXT,
    "details" JSONB,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adminRoleId" TEXT,
    "managerRoleId" TEXT,
    "assistantManagerRoleId" TEXT,
    "logsChannelId" TEXT,
    "postponementChannelId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_discordRoleId_key" ON "Team"("discordRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_managerId_key" ON "Team"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_assistantManagerId_key" ON "Team"("assistantManagerId");

-- CreateIndex
CREATE INDEX "Team_isArchived_idx" ON "Team"("isArchived");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_caseId_key" ON "Offer"("caseId");

-- CreateIndex
CREATE INDEX "Offer_playerId_status_idx" ON "Offer"("playerId", "status");

-- CreateIndex
CREATE INDEX "Offer_offeringTeamId_status_idx" ON "Offer"("offeringTeamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_caseId_key" ON "Transfer"("caseId");

-- CreateIndex
CREATE INDEX "Transfer_playerId_createdAt_idx" ON "Transfer"("playerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Demand_caseId_key" ON "Demand"("caseId");

-- CreateIndex
CREATE INDEX "Demand_playerId_status_idx" ON "Demand"("playerId", "status");

-- CreateIndex
CREATE INDEX "Match_currentTimestamp_status_idx" ON "Match"("currentTimestamp", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_homeTeamId_awayTeamId_originalTimestamp_key" ON "Match"("homeTeamId", "awayTeamId", "originalTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Postponement_caseId_key" ON "Postponement"("caseId");

-- CreateIndex
CREATE INDEX "Postponement_matchId_status_idx" ON "Postponement"("matchId", "status");

-- CreateIndex
CREATE INDEX "PostponementAction_postponementId_createdAt_idx" ON "PostponementAction"("postponementId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_createdAt_idx" ON "AuditLog"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_teamId_createdAt_idx" ON "AuditLog"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Case_number_key" ON "Case"("number");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Player"("discordId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_assistantManagerId_fkey" FOREIGN KEY ("assistantManagerId") REFERENCES "Player"("discordId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_offeringTeamId_fkey" FOREIGN KEY ("offeringTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postponement" ADD CONSTRAINT "Postponement_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postponement" ADD CONSTRAINT "Postponement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostponementAction" ADD CONSTRAINT "PostponementAction_postponementId_fkey" FOREIGN KEY ("postponementId") REFERENCES "Postponement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
