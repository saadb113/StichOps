// Each customer gets its own invoice prefix and its own sequence, so
// invoices read as NOJ-0001, NOJ-0002, ... instead of one global INV-000x
// series shared across every customer.
//
// Prefix = first 2 letters of the company name + first letter of the
// contact's name (e.g. "Northbridge Retail Ltd" + "James" -> "NOJ"). This is
// the client's own naming convention — deliberately not checked for
// collisions against other customers (two customers can end up with the
// same prefix). What does stay guaranteed unique is the actual invoiceNo,
// via the probe-forward loop in nextInvoiceNumberForCustomer below.

function lettersOnly(str) {
  return (str || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function generateInvoicePrefix(company, contactName) {
  const companyLetters = lettersOnly(company);
  const contactLetters = lettersOnly(contactName);
  const two = (companyLetters.slice(0, 2) || 'XX').padEnd(2, 'X');
  const one = contactLetters.slice(0, 1) || 'X';
  return two + one;
}

// Assigns a prefix on first use (existing customers created before this
// feature won't have one yet) and claims the next free number in that
// customer's own sequence — "free" meaning not already used as an
// invoiceNo, since a shared prefix (see above) could otherwise collide.
async function nextInvoiceNumberForCustomer(tx, customer) {
  let prefix = customer.invoicePrefix;
  if (!prefix) {
    prefix = generateInvoicePrefix(customer.company, customer.name);
    await tx.customer.update({ where: { id: customer.id }, data: { invoicePrefix: prefix } });
  }

  let seq = customer.nextInvoiceSeq;
  let invoiceNo;
  do {
    invoiceNo = `${prefix}-${String(seq).padStart(4, '0')}`;
    seq++;
  } while (await tx.invoice.findUnique({ where: { invoiceNo } }));

  await tx.customer.update({ where: { id: customer.id }, data: { nextInvoiceSeq: seq } });
  return invoiceNo;
}

module.exports = { generateInvoicePrefix, nextInvoiceNumberForCustomer };
