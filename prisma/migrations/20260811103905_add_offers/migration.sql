-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('NEW', 'COUNTERED', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OFFER';

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "buyerName" TEXT,
    "buyerContact" TEXT,
    "note" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_vehicleId_idx" ON "Offer"("vehicleId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
