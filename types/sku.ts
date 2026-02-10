export interface SKU {
  id: string;
  name: string;
  msrp: number;
  offerPrice: number;
  imageUrl?: string;
  processedImage?: string;
  isProcessingImage?: boolean;
}

export function createSKU(partial: Partial<SKU> & { name: string }): SKU {
  return {
    id: crypto.randomUUID(),
    msrp: 0,
    offerPrice: 0,
    ...partial,
  };
}

export function percentOff(msrp: number, offerPrice: number): number {
  if (msrp <= 0) return 0;
  return Math.round(((msrp - offerPrice) / msrp) * 100);
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
