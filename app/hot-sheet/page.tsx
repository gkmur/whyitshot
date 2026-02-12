"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  type HotSheet,
  type ListingInfo,
  type HotSheetSKU,
  type PressQuote,
  type TiktokEntry,
  createHotSheet,
  createPressQuote,
  createTiktokEntry,
  createHotSheetSKU,
} from "@/types/hot-sheet";
import { loadHotSheet, saveHotSheet } from "@/lib/hot-sheet-storage";
import { removeBg } from "@/lib/remove-bg";
import { dataUrlToBlobUrl } from "@/lib/blob-url";
import { useAutosave } from "@/lib/use-autosave";
import { BrandHeader } from "@/components/hot-sheet/brand-header";
import { ProseSection } from "@/components/hot-sheet/prose-section";
import { ListingInfoSection } from "@/components/hot-sheet/listing-info";
import { ListSection } from "@/components/hot-sheet/list-section";
import { SkuSection } from "@/components/hot-sheet/sku-section";
import { ExportControls } from "@/components/hot-sheet/export-controls";
import { filledSectionCount } from "@/lib/hot-sheet-export";

export default function HotSheetPage() {
  const [sheet, setSheet] = useState<HotSheet>(() => loadHotSheet() ?? createHotSheet());

  useAutosave(sheet, saveHotSheet);

  const update = useCallback(<K extends keyof HotSheet>(key: K, value: HotSheet[K]) => {
    setSheet((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showVerifyBanner, setShowVerifyBanner] = useState(sheet.aiGenerated);
  const abortRef = useRef<AbortController | null>(null);

  const hasContent =
    sheet.brandName.trim() !== "" ||
    sheet.whyItsHot.trim() !== "" ||
    sheet.pressFeatures.length > 0 ||
    sheet.topSkus.length > 0;

  const handleGenerate = async () => {
    if (!sheet.brandName.trim()) return;
    if (hasContent && !window.confirm("This will replace all current content. Continue?")) return;

    setIsGenerating(true);
    setGenerateError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/generate-hotsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: sheet.brandName, retailer: sheet.retailer }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        setGenerateError((data as { error?: string }).error || `Error ${res.status}`);
        return;
      }

      const data: unknown = await res.json();
      if (!data || typeof data !== "object") {
        setGenerateError("Invalid response from AI");
        return;
      }

      const d = data as Record<string, unknown>;
      const now = new Date().toISOString();

      setSheet((prev) => ({
        ...prev,
        whyItsHot: typeof d.whyItsHot === "string" ? d.whyItsHot : prev.whyItsHot,
        distribution: typeof d.distribution === "string" ? d.distribution : prev.distribution,
        listingInfo: d.listingInfo && typeof d.listingInfo === "object"
          ? { ...prev.listingInfo, ...(d.listingInfo as Partial<ListingInfo>) }
          : prev.listingInfo,
        pressFeatures: Array.isArray(d.pressFeatures)
          ? (d.pressFeatures as Partial<PressQuote>[]).map((p) => createPressQuote({ text: p.text ?? "", source: p.source ?? "", url: p.url }))
          : prev.pressFeatures,
        viralTiktoks: Array.isArray(d.viralTiktoks)
          ? (d.viralTiktoks as Partial<TiktokEntry>[]).map((t) => createTiktokEntry({ description: t.description ?? "", stats: t.stats ?? "" }))
          : prev.viralTiktoks,
        topSkus: Array.isArray(d.topSkus)
          ? (d.topSkus as Partial<HotSheetSKU>[]).map((s) => createHotSheetSKU({
              name: typeof s.name === "string" ? s.name : "",
              msrp: typeof s.msrp === "number" ? s.msrp : 0,
              offerPrice: typeof s.offerPrice === "number" ? s.offerPrice : 0,
              rating: typeof s.rating === "string" ? s.rating : undefined,
              reviewHighlight: typeof s.reviewHighlight === "string" ? s.reviewHighlight : undefined,
            }))
          : prev.topSkus,
        aiGenerated: true,
        updatedAt: now,
      }));
      setShowVerifyBanner(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setGenerateError("Generation failed. Try again.");
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const handleCancelGenerate = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  const handleStartNew = () => {
    if (!hasContent || window.confirm("Start a new Hot Sheet? This will replace all current content.")) {
      setSheet(createHotSheet());
      setShowVerifyBanner(false);
      setGenerateError(null);
    }
  };

  // Press features handlers
  const handleAddPress = useCallback(() => {
    setSheet((prev) => ({
      ...prev,
      pressFeatures: [...prev.pressFeatures, createPressQuote()],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleRemovePress = useCallback((id: string) => {
    setSheet((prev) => ({
      ...prev,
      pressFeatures: prev.pressFeatures.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleUpdatePress = useCallback((id: string, key: string, value: string) => {
    setSheet((prev) => ({
      ...prev,
      pressFeatures: prev.pressFeatures.map((p) =>
        p.id === id ? { ...p, [key]: value } : p
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // TikTok handlers
  const handleAddTiktok = useCallback(() => {
    setSheet((prev) => ({
      ...prev,
      viralTiktoks: [...prev.viralTiktoks, createTiktokEntry()],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleRemoveTiktok = useCallback((id: string) => {
    setSheet((prev) => ({
      ...prev,
      viralTiktoks: prev.viralTiktoks.filter((t) => t.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleUpdateTiktok = useCallback((id: string, key: string, value: string) => {
    setSheet((prev) => ({
      ...prev,
      viralTiktoks: prev.viralTiktoks.map((t) =>
        t.id === id ? { ...t, [key]: value } : t
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // SKU handlers
  const handleAddSku = useCallback((sku: HotSheetSKU) => {
    setSheet((prev) => ({
      ...prev,
      topSkus: [...prev.topSkus, sku],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleRemoveSku = useCallback((id: string) => {
    setSheet((prev) => ({
      ...prev,
      topSkus: prev.topSkus.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleUpdateSku = useCallback((id: string, updates: Partial<HotSheetSKU>) => {
    setSheet((prev) => ({
      ...prev,
      topSkus: prev.topSkus.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Image handling — mirrors app/page.tsx pattern
  const bgAbortMapRef = useRef<Map<string, AbortController>>(new Map());

  const runRemoveBg = useCallback(async (skuId: string, dataUrl: string) => {
    bgAbortMapRef.current.get(skuId)?.abort();
    const controller = new AbortController();
    bgAbortMapRef.current.set(skuId, controller);

    try {
      const processed = await removeBg(dataUrl, controller.signal);
      if (controller.signal.aborted) return;
      const processedBlobUrl = dataUrlToBlobUrl(processed);
      setSheet((prev) => ({
        ...prev,
        topSkus: prev.topSkus.map((s) => {
          if (s.id !== skuId) return s;
          if (s.processedImage?.startsWith("blob:")) URL.revokeObjectURL(s.processedImage);
          return { ...s, processedImage: processedBlobUrl, isProcessingImage: false };
        }),
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      if (controller.signal.aborted) return;
      setSheet((prev) => ({
        ...prev,
        topSkus: prev.topSkus.map((s) =>
          s.id === skuId ? { ...s, isProcessingImage: false } : s
        ),
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      bgAbortMapRef.current.delete(skuId);
    }
  }, []);

  const handleImageSelected = useCallback((skuId: string, dataUrl: string) => {
    bgAbortMapRef.current.get(skuId)?.abort();
    const blobUrl = dataUrlToBlobUrl(dataUrl);

    setSheet((prev) => ({
      ...prev,
      topSkus: prev.topSkus.map((s) => {
        if (s.id !== skuId) return s;
        if (s.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(s.imageUrl);
        if (s.processedImage?.startsWith("blob:")) URL.revokeObjectURL(s.processedImage);
        return { ...s, imageUrl: blobUrl, processedImage: undefined, isProcessingImage: true };
      }),
      updatedAt: new Date().toISOString(),
    }));

    runRemoveBg(skuId, dataUrl);
  }, [runRemoveBg]);

  const handleClearImage = useCallback((skuId: string) => {
    bgAbortMapRef.current.get(skuId)?.abort();
    bgAbortMapRef.current.delete(skuId);
    setSheet((prev) => ({
      ...prev,
      topSkus: prev.topSkus.map((s) => {
        if (s.id !== skuId) return s;
        if (s.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(s.imageUrl);
        if (s.processedImage?.startsWith("blob:")) URL.revokeObjectURL(s.processedImage);
        return { ...s, imageUrl: undefined, processedImage: undefined, isProcessingImage: false };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleRemoveBgManual = useCallback((skuId: string) => {
    setSheet((prev) => {
      const sku = prev.topSkus.find((s) => s.id === skuId);
      if (!sku?.imageUrl) return prev;
      return {
        ...prev,
        topSkus: prev.topSkus.map((s) =>
          s.id === skuId ? { ...s, isProcessingImage: true } : s
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    // Read current imageUrl from state
    const sku = sheet.topSkus.find((s) => s.id === skuId);
    if (sku?.imageUrl) {
      // Convert blob URL back to data URL for the API
      fetch(sku.imageUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              runRemoveBg(skuId, reader.result);
            }
          };
          reader.readAsDataURL(blob);
        });
    }
  }, [sheet.topSkus, runRemoveBg]);

  const handleListingInfoChange = useCallback((data: ListingInfo) => {
    setSheet((prev) => ({
      ...prev,
      listingInfo: data,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

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
            <span className="text-xs text-gray-400">Hot Sheet</span>
          </div>
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-accent transition-colors"
          >
            Top SKUs tool →
          </Link>
        </div>
      </header>

      {showVerifyBanner && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-3xl mx-auto px-6 py-2.5 flex items-center justify-between">
            <span className="text-xs text-amber-700 font-medium">
              AI-generated — verify data before sending
            </span>
            <button
              onClick={() => setShowVerifyBanner(false)}
              className="text-xs text-amber-500 hover:text-amber-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {generateError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-3xl mx-auto px-6 py-2.5 flex items-center justify-between">
            <span className="text-xs text-red-700">{generateError}</span>
            <button
              onClick={() => setGenerateError(null)}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="bg-accent/5 border-b border-accent/20">
          <div className="max-w-3xl mx-auto px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-accent font-medium">Generating Hot Sheet…</span>
            </div>
            <button
              onClick={handleCancelGenerate}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Brand + Retailer */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "40ms" }}>
          <BrandHeader
            brandName={sheet.brandName}
            retailer={sheet.retailer}
            onBrandNameChange={(v) => update("brandName", v)}
            onRetailerChange={(v) => update("retailer", v)}
            onStartNew={handleStartNew}
            onGenerate={handleGenerate}
            hasContent={hasContent}
            isGenerating={isGenerating}
          />
        </section>

        {/* Why It's Hot */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "80ms" }}>
          <ProseSection
            heading="Why It's Hot"
            value={sheet.whyItsHot}
            onChange={(v) => update("whyItsHot", v)}
            placeholder="2-4 sentence brand story — factual, not sales-y..."
          />
        </section>

        {/* Distribution */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "120ms" }}>
          <ProseSection
            heading="Distribution Channels & Similar Brands"
            emoji="🛒"
            value={sheet.distribution}
            onChange={(v) => update("distribution", v)}
            placeholder="Where the brand is sold, comparable brands, Amazon revenue data..."
          />
        </section>

        {/* Listing Info */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "160ms" }}>
          <ListingInfoSection
            data={sheet.listingInfo}
            onChange={handleListingInfoChange}
          />
        </section>

        {/* Press & Features */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "200ms" }}>
          <ListSection
            heading="Press & Features"
            items={sheet.pressFeatures}
            fields={[
              { key: "text", placeholder: "Quote or headline", wide: true },
              { key: "source", placeholder: "Source" },
              { key: "url", placeholder: "URL (optional)" },
            ]}
            onAdd={handleAddPress}
            onRemove={handleRemovePress}
            onUpdate={handleUpdatePress}
            addLabel="Add press quote"
          />
        </section>

        {/* Viral TikToks */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "240ms" }}>
          <ListSection
            heading="Viral TikToks"
            items={sheet.viralTiktoks}
            fields={[
              { key: "description", placeholder: "Video description", wide: true },
              { key: "stats", placeholder: "e.g. 2.4M views" },
            ]}
            onAdd={handleAddTiktok}
            onRemove={handleRemoveTiktok}
            onUpdate={handleUpdateTiktok}
            addLabel="Add TikTok"
          />
        </section>

        {/* Top SKUs */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "280ms" }}>
          <SkuSection
            skus={sheet.topSkus}
            onAdd={handleAddSku}
            onRemove={handleRemoveSku}
            onUpdate={handleUpdateSku}
            onImageSelected={handleImageSelected}
            onClearImage={handleClearImage}
            onRemoveBg={handleRemoveBgManual}
          />
        </section>
      </main>

      {filledSectionCount(sheet) > 0 && <ExportControls sheet={sheet} />}
    </div>
  );
}
