-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "paidDate" DATE,
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentNote" TEXT,
ADD COLUMN "lastReminderAt" TIMESTAMP(3),
ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_month_idx" ON "Expense"("month");
