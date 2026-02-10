"use client";

import { type SKU } from "@/types/sku";
import { ProductCard } from "./product-card";

interface CardGridProps {
  skus: SKU[];
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  onImageSelected: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
  onAddEmpty: () => void;
}

export function CardGrid({
  skus,
  onUpdate,
  onImageSelected,
  onRemove,
  onAddEmpty,
}: CardGridProps) {
  if (skus.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[720px] mx-auto">
      {skus.map((sku) => (
        <ProductCard
          key={sku.id}
          sku={sku}
          onUpdate={onUpdate}
          onImageSelected={onImageSelected}
          onRemove={onRemove}
        />
      ))}
      <button
        onClick={onAddEmpty}
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 text-gray-300 hover:border-orange-300 hover:text-orange-400 transition-colors min-h-[200px]"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-xs font-medium">Add SKU</span>
      </button>
    </div>
  );
}
