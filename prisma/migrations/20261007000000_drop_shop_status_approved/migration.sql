-- Remove unused ShopStatus value APPROVED (Phase 2, LIFE-10).
-- Defensive: remap any existing rows to ACTIVE before dropping the value.
UPDATE "Shop" SET "status" = 'ACTIVE' WHERE "status" = 'APPROVED';
ALTER TYPE "ShopStatus" DROP VALUE 'APPROVED';
