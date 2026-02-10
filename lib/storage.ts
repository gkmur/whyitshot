import { type SKU } from "@/types/sku";

const STORAGE_KEY = "topskus:session" as const;

function isValidSKU(v: unknown): v is { id: string; name: string; msrp: number; offerPrice: number } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.msrp === "number" &&
    typeof o.offerPrice === "number"
  );
}

function isSessionData(value: unknown): value is { version: 1; skus: unknown[] } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.skus);
}

export function saveSession(skus: SKU[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stripped = skus.map(({ imageUrl, processedImage, isProcessingImage, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, skus: stripped }));
    return true;
  } catch {
    return false;
  }
}

export function loadSession(): SKU[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSessionData(parsed)) return null;
    return parsed.skus.filter(isValidSKU).map((s) => ({
      id: s.id,
      name: s.name,
      msrp: s.msrp,
      offerPrice: s.offerPrice,
    }));
  } catch {
    return null;
  }
}
