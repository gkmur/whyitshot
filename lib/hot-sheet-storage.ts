import { type HotSheet } from "@/types/hot-sheet";

const STORAGE_KEY = "hotsheet:session" as const;

function isValidHotSheet(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.brandName === "string";
}

function isSessionData(value: unknown): value is { version: 1; data: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && typeof obj.data === "object" && obj.data !== null;
}

export function saveHotSheet(sheet: HotSheet): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stripped: Record<string, unknown> = {
      ...sheet,
      topSkus: sheet.topSkus.map(({ id, name, msrp, offerPrice, rating, reviewHighlight }) => ({
        id, name, msrp, offerPrice, rating, reviewHighlight,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: stripped }));
    return true;
  } catch {
    return false;
  }
}

export function loadHotSheet(): HotSheet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSessionData(parsed)) return null;
    if (!isValidHotSheet(parsed.data)) return null;
    return parsed.data as unknown as HotSheet;
  } catch {
    return null;
  }
}

export function clearHotSheet(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
