"use client";

import { useState, useRef, useEffect } from "react";
import { createSKU, type SKU, percentOff } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";
import { ImagePanel } from "./image-panel";
import { removeBg } from "@/lib/remove-bg";
import { dataUrlToBlobUrl } from "@/lib/blob-url";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [msrpValue, setMsrpValue] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [warnings, setWarnings] = useState<Partial<Record<FieldName, string>>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skuCount === 0) {
      const t = setTimeout(() => nameRef.current?.focus(), 480);
      return () => clearTimeout(t);
    }
  }, [skuCount]);

  // Debounced image suggestions while typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = nameValue.trim();
    if (trimmed.length >= 3 && !stagedImage) {
      debounceRef.current = setTimeout(() => {
        setSearchQuery(trimmed);
      }, 400);
    } else if (trimmed.length < 3) {
      setSearchQuery("");
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [nameValue, stagedImage]);

  const validatePrices = (msrp: string, price: string) => {
    const m = parseFloat(msrp);
    const p = parseFloat(price);
    if (m > 0 && p > 0 && p > m) {
      setWarnings((w) => ({ ...w, price: "Offer price is higher than MSRP" }));
    } else {
      setWarnings((w) => { const { price: _, ...rest } = w; return rest; });
    }
  };

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const imageToProcess = stagedImage;
    const msrp = parseFloat(msrpValue) || 0;
    const offerPrice = parseFloat(priceValue) || 0;
    const sku = createSKU({
      name: nameValue.trim() || "Untitled",
      msrp,
      offerPrice,
      imageUrl: imageToProcess ? dataUrlToBlobUrl(imageToProcess) : undefined,
      isProcessingImage: bgRemovalEnabled && !!imageToProcess,
    });
    onAddSingle(sku);
    setStagedImage(null);
    setNameValue("");
    setMsrpValue("");
    setPriceValue("");
    setSearchQuery("");
    setWarnings({});
    requestAnimationFrame(() => nameRef.current?.focus());

    if (bgRemovalEnabled && imageToProcess) {
      try {
        const processed = await removeBg(imageToProcess);
        onUpdate(sku.id, { processedImage: dataUrlToBlobUrl(processed), isProcessingImage: false });
      } catch {
        onUpdate(sku.id, { isProcessingImage: false });
      }
    }
  };

  const showSuggestions = searchQuery.length >= 3 && !stagedImage;

  const msrpNum = parseFloat(msrpValue) || 0;
  const priceNum = parseFloat(priceValue) || 0;
  const discount = percentOff(msrpNum, priceNum);

  return (
    <form onSubmit={handleAddManual} className="space-y-4">
      <input
        ref={nameRef}
        name="name"
        value={nameValue}
        onChange={(e) => setNameValue(e.target.value)}
        placeholder="What are you adding?"
        required
        className="w-full text-xl font-medium bg-transparent border-0 border-b-2 border-gray-200
                   px-0 py-2.5 focus:outline-none focus:border-accent
                   placeholder:text-gray-300 transition-colors"
      />

      {showSuggestions ? (
        <div className="space-y-2">
          <ImagePanel
            query={searchQuery}
            onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
          />
          <p className="text-[10px] text-gray-300 text-center">or drop / paste an image</p>
        </div>
      ) : (
        <ImageDropzone
          image={stagedImage ?? undefined}
          onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
          compact
        />
      )}

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 pointer-events-none">$</span>
          <input
            name="msrp"
            type="number"
            step="0.01"
            min="0"
            value={msrpValue}
            onChange={(e) => {
              setMsrpValue(e.target.value);
              validatePrices(e.target.value, priceValue);
            }}
            placeholder="MSRP"
            className="w-full text-sm bg-gray-50/80 border border-gray-100 rounded-lg pl-6 pr-2 py-2
                       focus:outline-none focus:border-accent tabular-nums"
          />
        </div>
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 pointer-events-none">$</span>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={priceValue}
            onChange={(e) => {
              setPriceValue(e.target.value);
              validatePrices(msrpValue, e.target.value);
            }}
            placeholder="Offer"
            className="w-full text-sm bg-gray-50/80 border border-gray-100 rounded-lg pl-6 pr-2 py-2
                       focus:outline-none focus:border-accent tabular-nums"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 px-5 py-2 bg-accent text-white rounded-full text-sm font-medium
                     hover:bg-accent-hover active:scale-[0.97] transition-colors"
        >
          Add
        </button>
      </div>
      <div className="h-4 -mt-2">
        {warnings.price ? (
          <p className="text-[11px] text-amber-500">{warnings.price}</p>
        ) : discount > 0 ? (
          <p className="text-[11px] text-accent font-medium">{discount}% off MSRP</p>
        ) : null}
      </div>
    </form>
  );
}
