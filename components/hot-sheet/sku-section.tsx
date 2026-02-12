"use client";

import { useCallback, useRef, useState } from "react";
import { type HotSheetSKU, createHotSheetSKU } from "@/types/hot-sheet";
import { formatPrice, percentOff } from "@/lib/format";
import { ImagePanel } from "@/components/image-panel";

interface SkuSectionProps {
  skus: HotSheetSKU[];
  onAdd: (sku: HotSheetSKU) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<HotSheetSKU>) => void;
  onImageSelected: (skuId: string, dataUrl: string) => void;
  onClearImage: (skuId: string) => void;
  onRemoveBg: (skuId: string) => void;
}

export function SkuSection({
  skus,
  onAdd,
  onRemove,
  onUpdate,
  onImageSelected,
  onClearImage,
  onRemoveBg,
}: SkuSectionProps) {
  const [name, setName] = useState("");
  const [msrp, setMsrp] = useState("");
  const [offer, setOffer] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const [searchOpenFor, setSearchOpenFor] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(
      createHotSheetSKU({
        name: name.trim(),
        msrp: parseFloat(msrp) || 0,
        offerPrice: parseFloat(offer) || 0,
      })
    );
    setName("");
    setMsrp("");
    setOffer("");
    nameRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleImageDrop = useCallback(
    (skuId: string, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file?.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSelected(skuId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleImagePaste = useCallback(
    (skuId: string, e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/")
      );
      if (!item) return;
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSelected(skuId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleSearchSelect = useCallback(
    (skuId: string, dataUrl: string) => {
      onImageSelected(skuId, dataUrl);
      setSearchOpenFor(null);
    },
    [onImageSelected]
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Top SKUs</h3>

      {/* Add form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-0.5 block">Product name</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Koda 16 Gas Pizza Oven"
            className="w-full text-sm bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none"
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-gray-500 mb-0.5 block">MSRP</label>
          <input
            type="number"
            value={msrp}
            onChange={(e) => setMsrp(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            className="w-full text-sm bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none"
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-gray-500 mb-0.5 block">Offer</label>
          <input
            type="number"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            className="w-full text-sm bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* SKU cards */}
      {skus.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skus.map((sku) => (
            <div key={sku.id} className="relative">
              <div
                className="border border-gray-100 rounded-xl p-3 bg-white group relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleImageDrop(sku.id, e)}
                onPaste={(e) => handleImagePaste(sku.id, e)}
              >
                <button
                  onClick={() => onRemove(sku.id)}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100 z-10"
                >
                  ✕
                </button>

                {/* Image area */}
                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-1 flex items-center justify-center overflow-hidden relative">
                  {sku.isProcessingImage && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {sku.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sku.processedImage || sku.imageUrl}
                      alt={sku.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-300">Drop or paste image</span>
                      <button
                        onClick={() => setSearchOpenFor(sku.id)}
                        className="text-xs text-accent hover:text-accent-hover transition-colors"
                      >
                        Search images
                      </button>
                    </div>
                  )}
                </div>

                {/* Image toolbar — visible when image exists */}
                {sku.imageUrl && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <button
                      onClick={() => setSearchOpenFor(sku.id)}
                      className="text-[10px] text-gray-400 hover:text-accent transition-colors"
                    >
                      Replace
                    </button>
                    <span className="text-gray-200">·</span>
                    {!sku.processedImage && !sku.isProcessingImage && (
                      <>
                        <button
                          onClick={() => onRemoveBg(sku.id)}
                          className="text-[10px] text-gray-400 hover:text-accent transition-colors"
                        >
                          Remove bg
                        </button>
                        <span className="text-gray-200">·</span>
                      </>
                    )}
                    <button
                      onClick={() => onClearImage(sku.id)}
                      className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Name */}
                <input
                  type="text"
                  value={sku.name}
                  onChange={(e) => onUpdate(sku.id, { name: e.target.value })}
                  className="w-full text-sm font-medium text-gray-800 bg-transparent border-0 outline-none truncate"
                />

                {/* Prices */}
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(sku.msrp)}
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    {formatPrice(sku.offerPrice)}
                  </span>
                  {sku.msrp > 0 && sku.offerPrice > 0 && sku.offerPrice < sku.msrp && (
                    <span className="text-xs font-medium text-green-600">
                      {percentOff(sku.msrp, sku.offerPrice)}% off
                    </span>
                  )}
                </div>

                {/* Rating + Review */}
                <input
                  type="text"
                  value={sku.rating ?? ""}
                  onChange={(e) => onUpdate(sku.id, { rating: e.target.value })}
                  placeholder="Rating (e.g. 4.8 stars on Amazon)"
                  className="w-full text-xs text-gray-500 bg-transparent border-0 outline-none mt-1 placeholder:text-gray-200"
                />
                <input
                  type="text"
                  value={sku.reviewHighlight ?? ""}
                  onChange={(e) => onUpdate(sku.id, { reviewHighlight: e.target.value })}
                  placeholder="Review highlight"
                  className="w-full text-xs text-gray-400 bg-transparent border-0 outline-none italic placeholder:text-gray-200"
                />
              </div>

              {/* Image search popover */}
              {searchOpenFor === sku.id && sku.name.trim().length >= 3 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Image search</span>
                    <button
                      onClick={() => setSearchOpenFor(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <ImagePanel
                    query={sku.name}
                    onImageSelected={(dataUrl) => handleSearchSelect(sku.id, dataUrl)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
