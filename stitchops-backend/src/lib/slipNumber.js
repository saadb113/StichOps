// Each employee gets their own salary-slip prefix and sequence, so slips
// read as SHA-0010, SHA-0011, ... — mirrors lib/invoiceNumber.js: derived
// from the employee's name (first 3 letters), not checked for collisions
// between employees, with the actual slipNo kept unique via a
// probe-forward loop instead.

function generateSlipPrefix(name) {
  const letters = (name || '').toUpperCase().replace(/[^A-Z]/g, '');
  return (letters.slice(0, 3) || 'EMP').padEnd(3, 'X');
}

async function nextSlipNumberForEmployee(tx, employee) {
  let prefix = employee.slipPrefix;
  if (!prefix) {
    prefix = generateSlipPrefix(employee.name);
    await tx.employee.update({ where: { id: employee.id }, data: { slipPrefix: prefix } });
  }

  let seq = employee.nextSlipSeq;
  let slipNo;
  do {
    slipNo = `${prefix}-${String(seq).padStart(4, '0')}`;
    seq++;
  } while (await tx.payslip.findUnique({ where: { slipNo } }));

  await tx.employee.update({ where: { id: employee.id }, data: { nextSlipSeq: seq } });
  return slipNo;
}

module.exports = { generateSlipPrefix, nextSlipNumberForEmployee };
