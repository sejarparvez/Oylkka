-- The enum type this column depends on was never created by any migration (the
-- schema defines it in enums.prisma but the migration only emitted the column
-- ALTER), which broke shadow-database replay / fresh environments.
-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('APPROVED', 'REJECTED', 'HIDDEN');

-- AlterTable
ALTER TABLE "review" ADD COLUMN     "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "review" ADD COLUMN     "moderationHistory" JSONB;
