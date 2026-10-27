ALTER TABLE "Company" ADD COLUMN "smtpStatus" TEXT,
ADD COLUMN "smtpCheckedAt" TIMESTAMP(3),
ADD COLUMN "smtpError" TEXT;
