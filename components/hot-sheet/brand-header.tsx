"use client";

import { useRef, useState } from "react";

const RETAILERS = ["Costco", "Sam's Club", "BJ's Wholesale"] as const;

interface BrandHeaderProps {
  brandName: string;
  retailer: string;
  onBrandNameChange: (value: string) => void;
  onRetailerChange: (value: string) => void;
  onStartNew: () => void;
  onGenerate: () => void;
  hasContent: boolean;
  isGenerating: boolean;
}

export function BrandHeader({
  brandName,
  retailer,
  onBrandNameChange,
  onRetailerChange,
  onStartNew,
  onGenerate,
  hasContent,
  isGenerating,
}: BrandHeaderProps) {
  const [customRetailer, setCustomRetailer] = useState(
    retailer && !RETAILERS.includes(retailer as (typeof RETAILERS)[number])
      ? retailer
      : ""
  );
  const isCustom =
    retailer !== "" && !RETAILERS.includes(retailer as (typeof RETAILERS)[number]);
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleRetailerSelect = (value: string) => {
    if (value === "__custom") {
      onRetailerChange(customRetailer);
      setTimeout(() => customInputRef.current?.focus(), 0);
    } else {
      setCustomRetailer("");
      onRetailerChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            value={brandName}
            onChange={(e) => onBrandNameChange(e.target.value)}
            placeholder="Brand name"
            className="text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-accent outline-none w-full max-w-sm placeholder:text-gray-300 font-[family-name:var(--font-sora)]"
          />
          <span className="text-gray-300 text-lg">—</span>
          <div className="flex items-center gap-2">
            <select
              value={isCustom ? "__custom" : retailer}
              onChange={(e) => handleRetailerSelect(e.target.value)}
              className="text-sm bg-gray-50/80 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none"
            >
              <option value="">Select retailer</option>
              {RETAILERS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="__custom">Other…</option>
            </select>
            {(isCustom || retailer === "") && (
              <input
                ref={customInputRef}
                type="text"
                value={customRetailer}
                onChange={(e) => {
                  setCustomRetailer(e.target.value);
                  onRetailerChange(e.target.value);
                }}
                placeholder="Retailer name"
                className="text-sm bg-gray-50/80 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none w-36"
                style={{ display: isCustom || retailer === "__custom" ? undefined : "none" }}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onGenerate}
            disabled={!brandName.trim() || isGenerating}
            className="px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </button>
          {hasContent && (
            <button
              onClick={onStartNew}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
            >
              Start new
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
