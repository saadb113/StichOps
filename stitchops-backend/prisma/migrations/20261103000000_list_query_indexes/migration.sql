-- Indexes for server-side filtering/paging of Orders, Invoices and Customers.
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_date_idx" ON "Order"("date");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_generatedDate_idx" ON "Invoice"("generatedDate");
CREATE INDEX IF NOT EXISTS "Customer_salespersonId_idx" ON "Customer"("salespersonId");
