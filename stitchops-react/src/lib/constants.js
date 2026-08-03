export const CCY = { "United Kingdom": "GBP", "United States": "USD", Germany: "EUR", France: "EUR", Australia: "AUD" };
export const SYM = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", PKR: "₨" };
// Real "today", computed once when the app loads (backed by the server's real dates now, not a frozen demo date).
export const TODAY = new Date().toISOString().slice(0, 10);
export const ORDER_STATUSES = ["Pending", "In progress", "Completed", "On hold", "Cancelled"];
