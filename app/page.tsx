"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { type SKU } from "@/types/sku";
import { DataInput } from "@/components/data-input";
import { CardGrid } from "@/components/card-grid";
import { ExportControls } from "@/components/export-controls";
import { GhostPreview } from "@/components/ghost-preview";
import { removeBg } from "@/lib/remove-bg";
import { dataUrlToBlobUrl } from "@/lib/blob-url";
import { loadSession, saveSession } from "@/lib/storage";
import { loadSampleData } from "@/lib/sample-data";
import { useAutosave } from "@/lib/use-autosave";

export default function Home() {
  const [skus, setSkus] = useState<SKU[]>(() => loadSession() ?? []);
  const [bgRemovalEnabled, setBgRemovalEnabled] = useState(true);
  const [showUndo, setShowUndo] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const lastClearedRef = useRef<SKU[]>([]);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgAbortMapRef = useRef<Map<string, AbortController>>(new Map());

  useAutosave(skus, saveSession);

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

  const handleLoadSamples = async () => {
    if (loadingSamples) return;
    setLoadingSamples(true);
    try {
      const samples = await loadSampleData();
      setSkus((prev) => [...prev, ...samples]);
    } finally {
      setLoadingSamples(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header
        className="border-b border-gray-200 bg-white"
        style={{ animation: "var(--animate-fade-in-up)", animationDelay: "0ms" }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight font-[family-name:var(--font-sora)]">
              Why It&apos;s Hot
            </h1>
            <span className="text-xs text-gray-400">Top SKUs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/hot-sheet"
              className="text-xs text-gray-400 hover:text-accent transition-colors"
            >
              Hot Sheet editor →
            </Link>
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
        <div
          className="max-w-md mx-auto"
          style={{ animation: "var(--animate-fade-in-up)", animationDelay: "80ms" }}
        >
          <DataInput
            onAddSingle={handleAddSingle}
            onUpdate={handleUpdate}
            bgRemovalEnabled={bgRemovalEnabled}
            skuCount={skus.length}
          />
        </div>

        {/* Card Preview (editable) */}
        {skus.length > 0 && (
          <section
            className="space-y-4"
            style={{ animation: "var(--animate-fade-in-up)", animationDelay: "180ms" }}
          >
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

        {/* Export Controls */}
        {skus.length > 0 && (
          <div style={{ animation: "var(--animate-fade-in-up)", animationDelay: "320ms" }}>
            <ExportControls skus={skus} disabled={skus.length === 0} />
          </div>
        )}

        {/* Empty State */}
        {skus.length === 0 && (
          <div
            className="space-y-8"
            style={{ animation: "var(--animate-fade-in-up)", animationDelay: "180ms" }}
          >
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-3">
                Add a product above, or
              </p>
              <button
                onClick={handleLoadSamples}
                disabled={loadingSamples}
                className="text-sm text-accent hover:text-accent-hover font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSamples ? "Loading…" : "see what this looks like →"}
              </button>
            </div>
            <GhostPreview />
          </div>
        )}
      </main>
    </div>
  );
}
