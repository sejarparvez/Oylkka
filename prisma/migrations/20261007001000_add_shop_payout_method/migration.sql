-- Vendor payout destination fields (Phase 2, LIFE-12b).
CREATE TYPE "PayoutMethod" AS ENUM ('BANK', 'BKASH', 'NAGAD');
ALTER TABLE "shop" ADD COLUMN "payoutMethod" "PayoutMethod";
ALTER TABLE "shop" ADD COLUMN "mobileNumber" TEXT;
