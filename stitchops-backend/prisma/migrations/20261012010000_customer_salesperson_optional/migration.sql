-- AlterTable: a customer no longer has to belong to a specific salesperson
-- (some customers are the company's own). The FK + ON DELETE RESTRICT stay
-- as they were, so an employee who still owns customers still can't be
-- deleted without reassigning those customers first.
ALTER TABLE "Customer" ALTER COLUMN "salespersonId" DROP NOT NULL;
