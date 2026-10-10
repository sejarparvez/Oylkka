-- A newly added product should appear on the storefront (home page "New
-- Arrivals", category/shop listings) without a separate manual publish step.
-- The 5fad674 audit remediation left the product form, API schema and DB all
-- defaulting to DRAFT, so products silently stayed invisible; align the DB
-- default with the form/API defaults now set to PUBLISHED.

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
