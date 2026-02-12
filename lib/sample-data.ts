import { createSKU, type SKU } from "@/types/sku";

const SAMPLE_PRODUCTS = [
  { name: "Sony WH-1000XM5", msrp: 399.99, offerPrice: 248.0, image: "/samples/sample-1.png" },
  { name: "Stanley Quencher H2.0", msrp: 45.0, offerPrice: 32.5, image: "/samples/sample-2.png" },
  { name: "Dyson Airwrap Complete", msrp: 599.99, offerPrice: 449.99, image: "/samples/sample-3.png" },
] as const;

export async function loadSampleData(): Promise<SKU[]> {
  const skus = await Promise.all(
    SAMPLE_PRODUCTS.map(async (p) => {
      const res = await fetch(p.image);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return createSKU({
        name: p.name,
        msrp: p.msrp,
        offerPrice: p.offerPrice,
        processedImage: blobUrl,
      });
    })
  );
  return skus;
}
