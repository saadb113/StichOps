-- SMTP settings for the admin password-reset email, editable from
-- Settings > System Data instead of server env vars.
ALTER TABLE "Company" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "Company" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "Company" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "Company" ADD COLUMN "smtpPass" TEXT;
ALTER TABLE "Company" ADD COLUMN "smtpFrom" TEXT;
