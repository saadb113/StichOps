-- DropIndex
DROP INDEX "Customer_invoicePrefix_key";

-- Reset previously-assigned prefixes so they get regenerated under the new
-- "2 letters of company + 1 letter of contact name" convention instead of
-- keeping the old 3-letters-of-company one.
UPDATE "Customer" SET "invoicePrefix" = NULL, "nextInvoiceSeq" = 1;
