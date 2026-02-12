export interface HotSheet {
  id: string;
  brandName: string;
  retailer: string;
  whyItsHot: string;
  distribution: string;
  listingInfo: ListingInfo;
  pressFeatures: PressQuote[];
  viralTiktoks: TiktokEntry[];
  topSkus: HotSheetSKU[];
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingInfo {
  leadTime: string;
  minOrderValue: string;
  maxOrderValue: string;
  availableForDotcom: boolean;
  link: string;
}

export interface PressQuote {
  id: string;
  text: string;
  source: string;
  url?: string;
}

export interface TiktokEntry {
  id: string;
  description: string;
  stats: string;
}

export interface HotSheetSKU {
  id: string;
  name: string;
  msrp: number;
  offerPrice: number;
  imageUrl?: string;
  processedImage?: string;
  isProcessingImage?: boolean;
  rating?: string;
  reviewHighlight?: string;
}

export function createHotSheet(): HotSheet {
  return {
    id: crypto.randomUUID(),
    brandName: "",
    retailer: "",
    whyItsHot: "",
    distribution: "",
    listingInfo: {
      leadTime: "",
      minOrderValue: "",
      maxOrderValue: "",
      availableForDotcom: false,
      link: "",
    },
    pressFeatures: [],
    viralTiktoks: [],
    topSkus: [],
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createPressQuote(partial?: Partial<PressQuote>): PressQuote {
  return {
    id: crypto.randomUUID(),
    text: "",
    source: "",
    ...partial,
  };
}

export function createTiktokEntry(partial?: Partial<TiktokEntry>): TiktokEntry {
  return {
    id: crypto.randomUUID(),
    description: "",
    stats: "",
    ...partial,
  };
}

export function createHotSheetSKU(partial?: Partial<HotSheetSKU>): HotSheetSKU {
  return {
    id: crypto.randomUUID(),
    name: "",
    msrp: 0,
    offerPrice: 0,
    ...partial,
  };
}
