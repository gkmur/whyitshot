"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  type HotSheet,
  type ListingInfo,
  type HotSheetSKU,
  createHotSheet,
  createPressQuote,
  createTiktokEntry,
} from "@/types/hot-sheet";
import { loadHotSheet, saveHotSheet } from "@/lib/hot-sheet-storage";
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

  const hasContent =
    sheet.brandName.trim() !== "" ||
    sheet.whyItsHot.trim() !== "" ||
    sheet.pressFeatures.length > 0 ||
    sheet.topSkus.length > 0;

  const handleStartNew = () => {
    if (!hasContent || window.confirm("Start a new Hot Sheet? This will replace all current content.")) {
      setSheet(createHotSheet());
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

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Brand + Retailer */}
        <section style={{ animation: "var(--animate-fade-in-up)", animationDelay: "40ms" }}>
          <BrandHeader
            brandName={sheet.brandName}
            retailer={sheet.retailer}
            onBrandNameChange={(v) => update("brandName", v)}
            onRetailerChange={(v) => update("retailer", v)}
            onStartNew={handleStartNew}
            hasContent={hasContent}
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
          />
        </section>
      </main>

      {filledSectionCount(sheet) > 0 && <ExportControls sheet={sheet} />}
    </div>
  );
}
