-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "agencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "agencyId" SET NOT NULL;

-- Vehicle.reference: unique per agency instead of globally unique.
DROP INDEX "Vehicle_reference_key";
CREATE UNIQUE INDEX "Vehicle_agencyId_reference_key" ON "Vehicle"("agencyId", "reference");

-- DropTable
DROP TABLE "Settings";
