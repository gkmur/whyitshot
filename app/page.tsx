"use client";

import { useState, useCallback } from "react";
import { type SKU, createSKU } from "@/types/sku";
import { DataInput } from "@/components/data-input";
import { CardGrid } from "@/components/card-grid";
import { ExportControls } from "@/components/export-controls";
import { removeBg } from "@/lib/remove-bg";

export default function Home() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(true);

  const handleImport = useCallback((imported: SKU[]) => {
    setSkus((prev) => [...prev, ...imported]);
  }, []);

  const handleAddSingle = useCallback((sku: SKU) => {
    setSkus((prev) => [...prev, sku]);
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<SKU>) => {
    setSkus((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSkus((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleImageSelected = useCallback(
    async (id: string, dataUrl: string) => {
      setSkus((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, imageUrl: dataUrl, isProcessingImage: bgRemovalEnabled }
            : s
        )
      );

      if (bgRemovalEnabled) {
        try {
          const processed = await removeBg(dataUrl);
          setSkus((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, processedImage: processed, isProcessingImage: false }
                : s
            )
          );
        } catch {
          setSkus((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, isProcessingImage: false } : s
            )
          );
        }
      }
    },
    [bgRemovalEnabled]
  );

  const handleAddEmpty = useCallback(() => {
    setSkus((prev) => [...prev, createSKU({ name: "Untitled" })]);
  }, []);

  const handleClear = () => setSkus([]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Top SKUs
            </h1>
            <p className="text-xs text-gray-400">Visual Generator</p>
          </div>
          {skus.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Data Input */}
        <div className="max-w-md mx-auto">
          <DataInput onImport={handleImport} onAddSingle={handleAddSingle} />
        </div>

        {/* Card Preview (editable) */}
        {skus.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Preview
                <span className="text-gray-400 font-normal ml-1">
                  ({skus.length} {skus.length === 1 ? "SKU" : "SKUs"})
                </span>
              </h2>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bgRemovalEnabled}
                  onChange={(e) => setBgRemovalEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                Auto-remove backgrounds
              </label>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <CardGrid
                skus={skus}
                onUpdate={handleUpdate}
                onImageSelected={handleImageSelected}
                onRemove={handleRemove}
                onAddEmpty={handleAddEmpty}
              />
            </div>
          </section>
        )}

        {/* Export Controls */}
        {skus.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Export</h2>
            <ExportControls skus={skus} disabled={skus.length === 0} />
          </section>
        )}

        {/* Empty State */}
        {skus.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-4 bg-gray-100 rounded-2xl mb-4">
              <svg
                className="w-8 h-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-1">No SKUs yet</p>
            <p className="text-xs text-gray-300">
              Paste data from your spreadsheet or add SKUs manually above
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
