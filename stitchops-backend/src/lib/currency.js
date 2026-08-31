// Converts an amount in `ccy` into the company's default currency using the
// stored CurrencyRate rows (rate = units of default currency per 1 unit of
// ccy). In-house figures (production cost, salaries, payslips, commissions)
// are always reported in the default currency — only customer-facing order
// prices and invoices keep their own selectable currency.
async function convertToDefaultCurrency(prisma, amount, ccy, defaultCcy) {
  if (ccy === defaultCcy) return amount;
  const rate = await prisma.currencyRate.findUnique({ where: { currency: ccy } });
  return rate ? amount * rate.rate : amount;
}

async function getDefaultCurrency(prisma) {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  return company?.defaultCurrency || 'PKR';
}

module.exports = { convertToDefaultCurrency, getDefaultCurrency };
