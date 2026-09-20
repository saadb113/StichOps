-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "invoicePrefix" TEXT,
ADD COLUMN     "nextInvoiceSeq" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Counter" ADD COLUMN     "lastAutoInvoiceRun" DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_invoicePrefix_key" ON "Customer"("invoicePrefix");
