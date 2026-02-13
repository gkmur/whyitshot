export { formatPrice, percentOff } from "@/lib/format";

export interface ImageCrop {
  zoom: number;   // 1 = fit, >1 = zoomed in
  x: number;      // pan offset as percentage (-50 to 50)
  y: number;      // pan offset as percentage (-50 to 50)
}

export const DEFAULT_CROP: ImageCrop = { zoom: 1, x: 0, y: 0 };

export interface SKU {
  id: string;
  name: string;
  msrp: number;
  offerPrice: number;
  imageUrl?: string;
  processedImage?: string;
  isProcessingImage?: boolean;
  imageError?: string;
  imageCrop?: ImageCrop;
}

export function createSKU(partial: Partial<SKU> & { name: string }): SKU {
  return {
    id: crypto.randomUUID(),
    msrp: 0,
    offerPrice: 0,
    ...partial,
  };
}
