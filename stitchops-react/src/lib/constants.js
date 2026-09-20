export const CCY = { "United Kingdom": "GBP", "United States": "USD", Germany: "EUR", France: "EUR", Australia: "AUD" };
export const SYM = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", PKR: "Rs." };
export const SYMIcon = { GBP: "/images/gbp.svg", USD: "/images/dollar.svg", EUR: "/images/euro.svg", AUD: "/images/dollar.svg", PKR: "Rs." };
export const CCY_NAMES = {
  PKR: "Pakistani Rupees (PKR)",
  USD: "US Dollar (USD)",
  GBP: "British Pound (GBP)",
  EUR: "Euro (EUR)",
  AUD: "Australian Dollar (AUD)"
};
// Orders, customers and invoices are always priced in a foreign currency —
// PKR (or whatever the company's default currency is) is reserved for
// in-house figures like salaries, commission and production cost.
export const CUSTOMER_CURRENCIES = Object.keys(SYM).filter((cc) => cc !== 'PKR');
export const PHONE_CODES = ["+92", "+44", "+1", "+971", "+61"];
// What a bank account needs depends on which country/region it's in — each
// entry's `fields` drives both the Add Account form and the read-only
// account card, keyed to the matching column on the backend BankAccount
// model (prisma/schema.prisma).
export const BANK_COUNTRIES = [
  {
    country: "United Kingdom",
    currency: "GBP",
    fields: [
      { key: "sortCode", label: "Sort Code", placeholder: "e.g. 23-14-70" },
      { key: "accountNo", label: "Account Number", placeholder: "e.g. 39475986" },
      { key: "iban", label: "IBAN", placeholder: "e.g. GB29 NWBK 6016 1331 92" }
    ]
  },
  {
    country: "United States",
    currency: "USD",
    fields: [
      { key: "routingNumber", label: "ACH and Wire Routing Number", placeholder: "e.g. 026073150" },
      { key: "accountNo", label: "Account Number", placeholder: "e.g. 8313793331" },
      { key: "accountType", label: "Account Type", placeholder: "e.g. Checking", options: ["Checking", "Savings"] }
    ]
  },
  {
    country: "Europe",
    currency: "EUR",
    fields: [
      { key: "bic", label: "BIC", placeholder: "e.g. TRWIBEB1XXX" },
      { key: "iban", label: "IBAN", placeholder: "e.g. BE23 9677 7336 4491" }
    ]
  },
  {
    country: "Australia",
    currency: "AUD",
    fields: [
      { key: "bsb", label: "BSB", placeholder: "e.g. 774001" },
      { key: "accountNo", label: "Account Number", placeholder: "e.g. 213288958" },
      { key: "bic", label: "Swift/BIC", placeholder: "e.g. TRWIAUS1XXX" }
    ]
  }
];
export const PAYMENT_ACCOUNTS = ["Wise", "Payoneer", "Direct Bank Transfer"];
export function splitContact(contact) {
  const trimmed = (contact || "").trim();
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) return { code: match[1], num: match[2] };
  return { code: "+92", num: trimmed };
}
// Real "today", computed once when the app loads (backed by the server's real dates now, not a frozen demo date).
export const TODAY = new Date().toISOString().slice(0, 10);
export const ORDER_STATUSES = ["Pending", "In progress", "Completed", "On hold", "Cancelled"];
