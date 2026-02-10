"use client";

import { type SKU, percentOff, formatPrice } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";

interface ProductCardProps {
  sku: SKU;
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  onImageSelected: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
}

export function ProductCard({
  sku,
  onUpdate,
  onImageSelected,
  onRemove,
}: ProductCardProps) {
  const discount = percentOff(sku.msrp, sku.offerPrice);

  return (
    <div className="relative group">
      <button
        onClick={() => onRemove(sku.id)}
        className="absolute -top-2 -right-2 z-10 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="Remove SKU"
      >
        &times;
      </button>

      <div className="flex flex-col items-center gap-2">
        <ImageDropzone
          image={sku.processedImage || sku.imageUrl}
          isProcessing={sku.isProcessingImage}
          onImageSelected={(dataUrl) => onImageSelected(sku.id, dataUrl)}
        />

        <div className="text-center w-full space-y-0.5">
          <input
            type="text"
            value={sku.name}
            onChange={(e) => onUpdate(sku.id, { name: e.target.value })}
            className="text-sm font-semibold text-center w-full bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-accent focus:outline-none transition-colors px-1 py-0.5"
            placeholder="Product Name"
          />

          <div className="flex items-center justify-center gap-1.5 text-xs">
            <span className="text-gray-400">MSRP:</span>
            <span className="text-gray-500 line-through">
              {formatPrice(sku.msrp)}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">Your Price:</span>
            <span className="font-semibold text-gray-800">
              {formatPrice(sku.offerPrice)}
            </span>
          </div>

          {discount > 0 && (
            <div className="text-xs">
              <span className="text-accent font-bold">{discount}% Off</span>
              <span className="text-gray-400"> MSRP</span>
              {sku.units && (
                <>
                  <span className="text-gray-300 mx-1">|</span>
                  <span className="text-gray-500">
                    {sku.units.toLocaleString()} Units
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

