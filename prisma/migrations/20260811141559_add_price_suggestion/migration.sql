-- CreateTable
CREATE TABLE "PriceSuggestion" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSuggestion_vehicleId_idx" ON "PriceSuggestion"("vehicleId");

-- AddForeignKey
ALTER TABLE "PriceSuggestion" ADD CONSTRAINT "PriceSuggestion_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
