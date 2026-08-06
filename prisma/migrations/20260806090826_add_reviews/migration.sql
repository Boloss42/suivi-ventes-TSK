-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "googleReviewUrl" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
