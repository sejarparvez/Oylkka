-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'REVERSED';

-- AlterTable
ALTER TABLE "payout_item" ADD COLUMN     "reversedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "disputeReason" TEXT;
