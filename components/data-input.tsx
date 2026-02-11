"use client";

import { useState, useRef, useEffect } from "react";
import { createSKU, type SKU } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";
import { ImagePanel } from "./image-panel";
import { removeBg } from "@/lib/remove-bg";

interface DataInputProps {
  onAddSingle: (sku: SKU) => void;
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  bgRemovalEnabled: boolean;
  skuCount: number;
}

type FieldName = "name" | "msrp" | "price";

export function DataInput({ onAddSingle, onUpdate, bgRemovalEnabled, skuCount }: DataInputProps) {
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [warnings, setWarnings] = useState<Partial<Record<FieldName, string>>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const msrpRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field on mount when no SKUs exist, and after adding
  useEffect(() => {
    if (skuCount === 0) {
      nameRef.current?.focus();
    }
  }, [skuCount]);

  const validatePrices = () => {
    const msrp = parseFloat(msrpRef.current?.value ?? "");
    const price = parseFloat(priceRef.current?.value ?? "");
    if (msrp > 0 && price > 0 && price > msrp) {
      setWarnings((w) => ({ ...w, price: "Offer price is higher than MSRP" }));
    } else {
      setWarnings((w) => {
        const { price: _, ...rest } = w;
        return rest;
      });
    }
  };

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const imageToProcess = stagedImage;
    const sku = createSKU({
      name: (data.get("name") as string) || "Untitled",
      msrp: parseFloat(data.get("msrp") as string) || 0,
      offerPrice: parseFloat(data.get("price") as string) || 0,
      imageUrl: imageToProcess ?? undefined,
      isProcessingImage: bgRemovalEnabled && !!imageToProcess,
    });
    onAddSingle(sku);
    form.reset();
    setStagedImage(null);
    setNameValue("");
    setPanelOpen(false);
    setWarnings({});

    // Re-focus name field
    requestAnimationFrame(() => nameRef.current?.focus());

    if (bgRemovalEnabled && imageToProcess) {
      try {
        const processed = await removeBg(imageToProcess);
        onUpdate(sku.id, { processedImage: processed, isProcessingImage: false });
      } catch {
        onUpdate(sku.id, { isProcessingImage: false });
      }
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <form onSubmit={handleAddManual} className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={nameRef}
                name="name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Product Name"
                required
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
              {nameValue.trim().length >= 3 && (
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="px-3 py-2 text-xs text-accent border border-accent/30 rounded-lg hover:bg-accent-light transition-colors whitespace-nowrap"
                >
                  Find images
                </button>
              )}
            </div>

            <ImageDropzone
              image={stagedImage ?? undefined}
              onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
              compact
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                ref={msrpRef}
                name="msrp"
                type="number"
                step="0.01"
                min="0"
                placeholder="MSRP"
                onBlur={validatePrices}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
              <input
                ref={priceRef}
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Offer Price"
                onBlur={validatePrices}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
            </div>
            {warnings.price && (
              <p className="text-[11px] text-amber-500">{warnings.price}</p>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Add SKU
            </button>
          </form>
        </div>
      </div>

      <ImagePanel
        query={nameValue.trim()}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
      />
    </>
  );
}
