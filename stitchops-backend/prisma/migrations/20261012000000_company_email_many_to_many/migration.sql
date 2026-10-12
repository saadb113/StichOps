-- CreateTable (implicit many-to-many join table for CompanyEmail <-> Employee)
CREATE TABLE "_CompanyEmailToEmployee" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- Carry forward existing single-owner assignments into the join table
INSERT INTO "_CompanyEmailToEmployee" ("A", "B")
SELECT "id", "employeeId" FROM "CompanyEmail" WHERE "employeeId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "CompanyEmail" DROP CONSTRAINT IF EXISTS "CompanyEmail_employeeId_fkey";

-- AlterTable
ALTER TABLE "CompanyEmail" DROP COLUMN "employeeId";

-- CreateIndex
CREATE UNIQUE INDEX "_CompanyEmailToEmployee_AB_unique" ON "_CompanyEmailToEmployee"("A", "B");

-- CreateIndex
CREATE INDEX "_CompanyEmailToEmployee_B_index" ON "_CompanyEmailToEmployee"("B");

-- AddForeignKey
ALTER TABLE "_CompanyEmailToEmployee" ADD CONSTRAINT "_CompanyEmailToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "CompanyEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyEmailToEmployee" ADD CONSTRAINT "_CompanyEmailToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
