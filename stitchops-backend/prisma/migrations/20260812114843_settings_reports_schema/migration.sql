-- AlterTable
ALTER TABLE "Company" DROP COLUMN "accountAUD",
DROP COLUMN "accountEUR",
DROP COLUMN "accountGBP",
DROP COLUMN "accountName",
DROP COLUMN "accountUSD",
DROP COLUMN "bankName",
ADD COLUMN     "contact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "defaultCurrency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "currency" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountNo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" SERIAL NOT NULL,
    "currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_currency_key" ON "CurrencyRate"("currency");

