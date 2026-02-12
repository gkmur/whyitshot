export function percentOff(msrp: number, offerPrice: number): number {
  if (msrp <= 0) return 0;
  return Math.round(((msrp - offerPrice) / msrp) * 100);
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
