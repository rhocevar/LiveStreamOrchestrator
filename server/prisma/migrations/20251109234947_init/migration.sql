-- CreateEnum
CREATE TYPE "LivestreamStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'VIEWER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'LEFT');

-- CreateTable
CREATE TABLE "livestreams" (
    "id" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LivestreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdBy" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 100,
    "emptyTimeout" INTEGER NOT NULL DEFAULT 86400,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "livestreams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "livestreamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'VIEWER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "metadata" JSONB,
    "livekitParticipantSid" TEXT,
    "livekitRoomSid" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_livekitParticipantSid_key" ON "participants"("livekitParticipantSid");

-- CreateIndex
CREATE INDEX "participants_livestreamId_status_idx" ON "participants"("livestreamId", "status");

-- CreateIndex
CREATE INDEX "participants_userId_idx" ON "participants"("userId");

-- CreateIndex
CREATE INDEX "participants_livekitParticipantSid_idx" ON "participants"("livekitParticipantSid");

-- CreateIndex
CREATE INDEX "webhook_events_id_idx" ON "webhook_events"("id");

-- CreateIndex
CREATE INDEX "webhook_events_expiresAt_idx" ON "webhook_events"("expiresAt");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_livestreamId_fkey" FOREIGN KEY ("livestreamId") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
