"use client";

import React, { useState } from "react";
import { type SKU, percentOff, formatPrice } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";
import { ImagePanel } from "./image-panel";

interface ProductCardProps {
  sku: SKU;
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  onImageSelected: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
  onClearImage: (id: string) => void;
  onRemoveBg: (id: string) => void;
}

function EditablePrice({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(parseFloat(draft) || 0);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(parseFloat(draft) || 0);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-14 text-xs text-center bg-transparent border-b border-accent focus:outline-none tabular-nums"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value > 0 ? value.toString() : "");
        setEditing(true);
      }}
      className="hover:text-accent transition-colors cursor-text"
      title={`Edit ${label}`}
    >
      {formatPrice(value)}
    </button>
  );
}

export const ProductCard = React.memo(function ProductCard({
  sku,
  onUpdate,
  onImageSelected,
  onRemove,
  onClearImage,
  onRemoveBg,
}: ProductCardProps) {
  const discount = percentOff(sku.msrp, sku.offerPrice);
  const [showSearch, setShowSearch] = useState(false);
  const hasImage = !!(sku.processedImage || sku.imageUrl);

  return (
    <div className="relative group">
      <button
        onClick={() => onRemove(sku.id)}
        className="absolute -top-2 -right-2 z-10 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="Remove SKU"
      >
        &times;
      </button>

      {!hasImage && !showSearch && sku.name.length >= 3 && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute -top-2 -left-2 z-10 w-5 h-5 bg-accent text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-hover"
          title="Search for image"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center gap-2">
        <ImageDropzone
          image={sku.processedImage || sku.imageUrl}
          isProcessing={sku.isProcessingImage}
          onImageSelected={(dataUrl) => {
            onImageSelected(sku.id, dataUrl);
            setShowSearch(false);
          }}
        />

        {hasImage && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="text-[10px] text-gray-400 hover:text-accent transition-colors"
            >
              Search
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
              onClick={() => { onClearImage(sku.id); setShowSearch(false); }}
              className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {showSearch && (
          <div className="w-full">
            <ImagePanel
              query={sku.name}
              onImageSelected={(dataUrl) => {
                onImageSelected(sku.id, dataUrl);
                setShowSearch(false);
              }}
            />
          </div>
        )}

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
            <span className="text-gray-400">
              <EditablePrice
                value={sku.msrp}
                onChange={(v) => onUpdate(sku.id, { msrp: v })}
                label="MSRP"
              />
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">Your Price:</span>
            <span className="font-semibold text-gray-800">
              <EditablePrice
                value={sku.offerPrice}
                onChange={(v) => onUpdate(sku.id, { offerPrice: v })}
                label="offer price"
              />
            </span>
          </div>

          {discount > 0 && (
            <div className="text-xs">
              <span className="text-accent font-bold">{discount}% Off</span>
              <span className="text-gray-400"> MSRP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
