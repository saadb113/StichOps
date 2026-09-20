-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "slipPrefix" TEXT,
ADD COLUMN     "nextSlipSeq" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastSlipApprovedPeriod" DATE;

-- AlterTable
ALTER TABLE "Counter" ADD COLUMN     "lastSlipNotifyRun" DATE;

-- Backfill slipPrefix for existing employees (first 3 letters of their
-- name, letters only, uppercased) so previews work immediately instead of
-- waiting for a lazy first-approval assignment.
UPDATE "Employee" SET "slipPrefix" = upper(left(regexp_replace(name, '[^A-Za-z]', '', 'g'), 3))
WHERE "slipPrefix" IS NULL;
