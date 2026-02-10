import { type SKU, createSKU } from "@/types/sku";

interface PersistedSKU {
  readonly id: string;
  readonly name: string;
  readonly msrp: number;
  readonly offerPrice: number;
  readonly units?: number;
}

interface SessionData {
  readonly version: 1;
  readonly skus: readonly PersistedSKU[];
  readonly savedAt: string;
}

const STORAGE_KEY = "topskus:session" as const;

function toPersistedSKU(sku: SKU): PersistedSKU {
  return {
    id: sku.id,
    name: sku.name,
    msrp: sku.msrp,
    offerPrice: sku.offerPrice,
    ...(sku.units !== undefined ? { units: sku.units } : {}),
  };
}

function fromPersistedSKU(persisted: PersistedSKU): SKU {
  return {
    id: persisted.id,
    name: persisted.name,
    msrp: persisted.msrp,
    offerPrice: persisted.offerPrice,
    ...(persisted.units !== undefined ? { units: persisted.units } : {}),
  };
}

function isSessionData(value: unknown): value is SessionData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.skus);
}

export function saveSession(skus: SKU[]): boolean {
  if (typeof window === "undefined") return false;
  const data: SessionData = {
    version: 1,
    skus: skus.map(toPersistedSKU),
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    return parsed.skus.map(fromPersistedSKU);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
