"use client";

import { useState, useCallback, useRef } from "react";
import { type SKU } from "@/types/sku";
import { DataInput } from "@/components/data-input";
import { CardGrid } from "@/components/card-grid";
import { ExportControls } from "@/components/export-controls";
import { removeBg } from "@/lib/remove-bg";
import { dataUrlToBlobUrl } from "@/lib/blob-url";
import { loadSession } from "@/lib/storage";
import { useAutosave } from "@/lib/use-autosave";

export default function Home() {
  const [skus, setSkus] = useState<SKU[]>(() => loadSession() ?? []);
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(true);
  const [showUndo, setShowUndo] = useState(false);
  const lastClearedRef = useRef<SKU[]>([]);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgAbortMapRef = useRef<Map<string, AbortController>>(new Map());

  useAutosave(skus);

  const handleAddSingle = useCallback((sku: SKU) => {
    setSkus((prev) => [...prev, sku]);
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<SKU>) => {
    setSkus((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const revokeSkuImages = (sku: SKU) => {
    if (sku.processedImage?.startsWith("blob:")) URL.revokeObjectURL(sku.processedImage);
    if (sku.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(sku.imageUrl);
  };

  const handleRemove = useCallback((id: string) => {
    bgAbortMapRef.current.get(id)?.abort();
    bgAbortMapRef.current.delete(id);
    setSkus((prev) => {
      const removed = prev.find((s) => s.id === id);
      if (removed) revokeSkuImages(removed);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const handleImageSelected = useCallback(
    async (id: string, dataUrl: string) => {
      // Cancel any prior BG removal for this SKU
      bgAbortMapRef.current.get(id)?.abort();
      const controller = new AbortController();
      bgAbortMapRef.current.set(id, controller);

      const blobUrl = dataUrlToBlobUrl(dataUrl);

      setSkus((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          if (s.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(s.imageUrl);
          return { ...s, imageUrl: blobUrl, isProcessingImage: bgRemovalEnabled };
        })
      );

      if (bgRemovalEnabled) {
        try {
          const processed = await removeBg(dataUrl, controller.signal);
          if (controller.signal.aborted) return;
          const processedBlobUrl = dataUrlToBlobUrl(processed);
          setSkus((prev) =>
            prev.map((s) => {
              if (s.id !== id) return s;
              if (s.processedImage?.startsWith("blob:")) URL.revokeObjectURL(s.processedImage);
              return { ...s, processedImage: processedBlobUrl, isProcessingImage: false };
            })
          );
        } catch {
          if (controller.signal.aborted) return;
          setSkus((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, isProcessingImage: false } : s
            )
          );
        } finally {
          bgAbortMapRef.current.delete(id);
        }
      }
    },
    [bgRemovalEnabled]
  );


  const handleClear = () => {
    // Abort all in-flight BG removals
    for (const ctrl of bgAbortMapRef.current.values()) ctrl.abort();
    bgAbortMapRef.current.clear();

    lastClearedRef.current = skus;
    setSkus([]);
    setShowUndo(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      lastClearedRef.current.forEach(revokeSkuImages);
      lastClearedRef.current = [];
      setShowUndo(false);
    }, 5000);
  };

  const handleUndoClear = () => {
    setSkus(lastClearedRef.current.map((s) => ({ ...s, isProcessingImage: false })));
    setShowUndo(false);
  };

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSkus((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleBgToggle = (enabled: boolean) => {
    setBgRemovalEnabled(enabled);
    if (!enabled) {
      for (const ctrl of bgAbortMapRef.current.values()) ctrl.abort();
      bgAbortMapRef.current.clear();
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight font-[family-name:var(--font-sora)]">
              Why It&apos;s Hot
            </h1>
            <span className="text-xs text-gray-400">Top SKUs</span>
          </div>
          <div className="flex items-center gap-3">
            {showUndo && (
              <button
                onClick={handleUndoClear}
                className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
              >
                Undo clear
              </button>
            )}
            {skus.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Data Input */}
        <div className="max-w-md mx-auto">
          <DataInput
            onAddSingle={handleAddSingle}
            onUpdate={handleUpdate}
            bgRemovalEnabled={bgRemovalEnabled}
            skuCount={skus.length}
          />
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
                  onChange={(e) => handleBgToggle(e.target.checked)}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                />
                Auto-remove backgrounds
              </label>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <CardGrid
                skus={skus}
                onUpdate={handleUpdate}
                onImageSelected={handleImageSelected}
                onRemove={handleRemove}
                onReorder={handleReorder}
              />
            </div>
          </section>
        )}

        {/* Export Controls (sticky bottom bar) */}
        {skus.length > 0 && (
          <ExportControls skus={skus} disabled={skus.length === 0} />
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
              Add your first product above
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
