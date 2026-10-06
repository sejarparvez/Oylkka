-- AlterTable
ALTER TABLE "review" ADD COLUMN     "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "review" ADD COLUMN     "moderationHistory" JSONB;