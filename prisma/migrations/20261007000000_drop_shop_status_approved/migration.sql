-- Remove unused ShopStatus value APPROVED (Phase 2, LIFE-10).
--
-- Two bugs in the original version of this migration:
--   1. `ALTER TYPE ... DROP VALUE` is not PostgreSQL syntax (Postgres can only
--      ADD enum values), so this always failed. The type has to be recreated
--      without the value and the column re-cast.
--   2. It updated `"Shop"`, but the model is @@map("shop") — the lowercase name
--      is what exists.
--
-- Defensive: remap any existing rows to ACTIVE before the value disappears, so
-- the re-cast cannot fail on a leftover 'APPROVED'.
UPDATE "shop" SET "status" = 'ACTIVE' WHERE "status" = 'APPROVED';

ALTER TYPE "ShopStatus" RENAME TO "ShopStatus_old";

CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

ALTER TABLE "shop" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "shop" ALTER COLUMN "status" TYPE "ShopStatus"
  USING ("status"::text::"ShopStatus");
ALTER TABLE "shop" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "ShopStatus_old";
