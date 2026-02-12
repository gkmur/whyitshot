export { formatPrice, percentOff } from "@/lib/format";

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
