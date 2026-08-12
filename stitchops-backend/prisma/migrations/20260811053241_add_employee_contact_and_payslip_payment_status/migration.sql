-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contact" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'Pending';
