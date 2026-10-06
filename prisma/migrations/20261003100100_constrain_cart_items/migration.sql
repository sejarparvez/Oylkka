-- MONEY-37: no unique constraint on (cartId, productId, variantId), so
-- concurrent adds create duplicate cart lines. `cart/add.ts` used
-- findFirst + create, which is check-then-act and loses the race.
--
-- The obvious fix — @@unique([cartId, productId, variantId]) — does not work
-- on Postgres: variantId is nullable and NULLs are distinct in a unique
-- index, so simple products would still duplicate. Partial indexes would fix
-- the data but Prisma cannot express them, and `prisma migrate dev` drops
-- anything it cannot represent. So use a non-null surrogate instead: it is
-- expressible in the schema, survives migrate dev, and gives Prisma a real
-- compound selector so add.ts can upsert instead of check-then-act.

-- AlterTable: add the surrogate column as nullable so existing rows can be
-- backfilled before the NOT NULL constraint lands.
ALTER TABLE "cart_item" ADD COLUMN "variantKey" TEXT;

-- Backfill from the existing variantId.
UPDATE "cart_item" SET "variantKey" = COALESCE("variantId", '');

-- Merge duplicates into the surviving (newest) row by summing quantity, which
-- reconstructs the accumulated total the user intended: each duplicate row was
-- created by an independent add that never saw the other.
WITH ranked AS (
  SELECT
    "id",
    SUM(quantity) OVER (
      PARTITION BY "cartId", "productId", "variantKey"
    ) AS merged_quantity,
    ROW_NUMBER() OVER (
      PARTITION BY "cartId", "productId", "variantKey"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "cart_item"
)
UPDATE "cart_item" ci
SET "quantity" = r.merged_quantity
FROM ranked r
WHERE ci."id" = r."id" AND r.rn = 1;

-- Drop the now-redundant rows.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "cartId", "productId", "variantKey"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "cart_item"
)
DELETE FROM "cart_item" ci
USING ranked r
WHERE ci."id" = r."id" AND r.rn > 1;

-- A merged total can exceed what is purchasable, so clamp every line to what is
-- actually available. Checkout decrements Product.stock for variant items too,
-- so the variant line is bounded by both. Lines with nothing available are left
-- alone so the UI can render them as out of stock rather than as quantity 0.
WITH availability AS (
  SELECT
    ci."id" AS item_id,
    CASE
      WHEN pv."id" IS NOT NULL
        THEN LEAST(pv."stock" - pv."reservedStock", p."stock")
      ELSE p."stock"
    END AS available
  FROM "cart_item" ci
  JOIN "product" p ON p."id" = ci."productId"
  LEFT JOIN "product_variant" pv ON pv."id" = ci."variantId"
)
UPDATE "cart_item" ci
SET "quantity" = LEAST(ci."quantity", a.available)
FROM availability a
WHERE ci."id" = a."item_id"
  AND a.available > 0
  AND ci."quantity" > a.available;

-- AlterTable: make the surrogate non-null with a safe default.
ALTER TABLE "cart_item" ALTER COLUMN "variantKey" SET DEFAULT '';
ALTER TABLE "cart_item" ALTER COLUMN "variantKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cartId_productId_variantKey_key" ON "cart_item"("cartId", "productId", "variantKey");