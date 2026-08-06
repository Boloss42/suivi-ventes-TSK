-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STAT', 'REVIEW');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'STAT',
ALTER COLUMN "vehicleId" DROP NOT NULL;
