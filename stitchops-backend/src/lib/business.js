function commissionAmt(order) {
  return order.price * (order.commissionRate / 100);
}

module.exports = { commissionAmt };
