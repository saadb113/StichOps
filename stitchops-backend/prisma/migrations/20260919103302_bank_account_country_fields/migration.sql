-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'United Kingdom',
ADD COLUMN     "accountHolder" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sortCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "routingNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "accountType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bic" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "iban" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bsb" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "address" TEXT NOT NULL DEFAULT '';

-- Backfill country from the existing currency on rows created before this
-- column existed, so pre-existing accounts don't all end up mislabeled
-- "United Kingdom".
UPDATE "BankAccount" SET "country" = CASE "currency"
  WHEN 'GBP' THEN 'United Kingdom'
  WHEN 'USD' THEN 'United States'
  WHEN 'EUR' THEN 'Europe'
  WHEN 'AUD' THEN 'Australia'
  ELSE "country"
END;
