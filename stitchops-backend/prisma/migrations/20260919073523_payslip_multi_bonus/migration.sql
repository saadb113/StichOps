-- AlterTable
ALTER TABLE "Payslip" DROP COLUMN "bonusLabel",
DROP COLUMN "bonusAmount",
ADD COLUMN     "bonusTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PayslipBonus" (
    "id" SERIAL NOT NULL,
    "payslipId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PayslipBonus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayslipBonus" ADD CONSTRAINT "PayslipBonus_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
