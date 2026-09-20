-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "bonusLabel" TEXT,
ADD COLUMN     "bonusAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
