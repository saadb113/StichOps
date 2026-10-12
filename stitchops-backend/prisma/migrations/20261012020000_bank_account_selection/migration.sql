-- Lets admin pick a specific bank account per customer (default for future
-- invoices) and per invoice (override at any time), instead of always
-- auto-matching by currency.
ALTER TABLE "Customer" ADD COLUMN "preferredBankAccountId" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "bankAccountId" INTEGER;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_preferredBankAccountId_fkey"
  FOREIGN KEY ("preferredBankAccountId") REFERENCES "BankAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
