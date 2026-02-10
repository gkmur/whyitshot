import { createSKU, type SKU } from "@/types/sku";

export function parseTSV(text: string): SKU[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  const skus: SKU[] = [];

  for (const line of lines) {
    const cols = line.split("\t").map((c) => c.trim());
    if (cols.length === 0 || !cols[0]) continue;

    // Try to parse: Name, MSRP, Offer Price
    const name = cols[0];
    const msrp = parsePrice(cols[1]);
    const offerPrice = parsePrice(cols[2]);
    skus.push(createSKU({ name, msrp, offerPrice }));
  }

  return skus;
}

function parsePrice(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}
