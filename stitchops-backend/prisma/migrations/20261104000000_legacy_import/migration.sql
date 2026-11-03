-- "Import old data" wizard: batches (for undo) and externally billed orders.
CREATE TABLE "ImportBatch" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "externallyBilled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "importBatchId" INTEGER;
ALTER TABLE "Customer" ADD COLUMN "importBatchId" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "importBatchId" INTEGER;

ALTER TABLE "Order" ADD CONSTRAINT "Order_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
