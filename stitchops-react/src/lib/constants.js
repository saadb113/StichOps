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
export const PHONE_CODES = ["+92", "+44", "+1", "+971", "+61"];
export function splitContact(contact) {
  const trimmed = (contact || "").trim();
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) return { code: match[1], num: match[2] };
  return { code: "+92", num: trimmed };
}
// Real "today", computed once when the app loads (backed by the server's real dates now, not a frozen demo date).
export const TODAY = new Date().toISOString().slice(0, 10);
export const ORDER_STATUSES = ["Pending", "In progress", "Completed", "On hold", "Cancelled"];
