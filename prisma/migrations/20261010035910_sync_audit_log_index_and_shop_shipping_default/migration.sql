-- DropIndex
DROP INDEX "audit_log_entity_entityId_idx";

-- AlterTable
ALTER TABLE "shop" ALTER COLUMN "shippingCost" SET DEFAULT 60;
