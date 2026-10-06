-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "email_queue" ADD COLUMN     "startedAt" TIMESTAMP(3);