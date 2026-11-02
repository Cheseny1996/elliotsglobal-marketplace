export function getCommissionPercent(value = process.env.PLATFORM_COMMISSION_PERCENT ?? "15") {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 30 || Math.round(percent * 100) !== percent * 100) {
    throw new Error("PLATFORM_COMMISSION_PERCENT must be a value from 0 to 30 with at most two decimal places.");
  }
  return percent;
}

export function calculateSellerSplit(unitPriceCents: number, quantity: number, commissionPercent: number) {
  const itemSubtotalCents = unitPriceCents * quantity;
  const platformFeeCents = Math.round(itemSubtotalCents * commissionPercent / 100);
  return {
    itemSubtotalCents,
    platformFeeCents,
    sellerPayoutCents: itemSubtotalCents - platformFeeCents,
  };
}

export function getShippingCents(subtotalCents: number) {
  return subtotalCents >= 7500 ? 0 : 795;
}
