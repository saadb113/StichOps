const nodemailer = require('nodemailer');
const prisma = require('./prisma');

// SMTP settings live on the Company row (Settings > System Data) so the
// admin can change mailboxes without touching server env vars or
// redeploying — env vars (SMTP_HOST etc.) are only a fallback for when
// nothing's configured in the database yet.
async function getSettings() {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  if (company && company.smtpHost && company.smtpUser && company.smtpPass) {
    return {
      host: company.smtpHost,
      port: company.smtpPort || 465,
      user: company.smtpUser,
      pass: company.smtpPass,
      from: company.smtpFrom || company.smtpUser
    };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    };
  }
  return null;
}

async function isConfigured() {
  return Boolean(await getSettings());
}

function buildTransporter(settings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    // Hostinger (and most providers) use implicit TLS on 465, STARTTLS on
    // 587 — secure must match the port or the handshake fails.
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
}

async function sendMail({ to, subject, html, text }) {
  const settings = await getSettings();
  if (!settings) throw new Error('Email sending is not configured — set it up in Settings > System Data.');
  const transporter = buildTransporter(settings);
  await transporter.sendMail({ from: settings.from, to, subject, html, text });
}

// Used by the "Send Test Email" button — verifies the SMTP credentials
// authenticate without actually sending anything.
async function verifySettings(settings) {
  const transporter = buildTransporter(settings);
  await transporter.verify();
}

module.exports = { isConfigured, sendMail, verifySettings, getSettings };
