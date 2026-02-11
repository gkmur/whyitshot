"use client";

import { useState, useEffect, useRef } from "react";
import { parseTSV } from "@/lib/parse-tsv";
import { createSKU, type SKU } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";
import { removeBg } from "@/lib/remove-bg";
import type { ImageSuggestion } from "@/types/suggest-images";

interface DataInputProps {
  onImport: (skus: SKU[]) => void;
  onAddSingle: (sku: SKU) => void;
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  bgRemovalEnabled: boolean;
}

export function DataInput({ onImport, onAddSingle, onUpdate, bgRemovalEnabled }: DataInputProps) {
  const [pasteValue, setPasteValue] = useState("");
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [stagedImage, setStagedImage] = useState<string | null>(null);

  const [nameValue, setNameValue] = useState("");
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const suggestAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { suggestAbortRef.current?.abort(); };
  }, []);

  const fetchSuggestions = async (query: string) => {
    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    setSuggestLoading(true);
    setSuggestError(null);
    setLastQuery(query);

    try {
      const res = await fetch("/api/suggest-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setSuggestions(data.images ?? []);
      if ((data.images ?? []).length === 0) {
        setSuggestError("No images found");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSuggestError("Couldn't load suggestions");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const q = e.target.value.trim();
    if (q.length < 3 || q === lastQuery) return;
    fetchSuggestions(q);
  };

  const handleSuggestionClick = (dataUrl: string) => {
    setStagedImage(dataUrl);
  };

  const handleImport = () => {
    const skus = parseTSV(pasteValue);
    if (skus.length > 0) {
      onImport(skus);
      setPasteValue("");
    }
  };

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    suggestAbortRef.current?.abort();
    const form = e.currentTarget;
    const data = new FormData(form);
    const imageToProcess = stagedImage;
    const sku = createSKU({
      name: (data.get("name") as string) || "Untitled",
      msrp: parseFloat(data.get("msrp") as string) || 0,
      offerPrice: parseFloat(data.get("price") as string) || 0,
      imageUrl: imageToProcess ?? undefined,
      isProcessingImage: bgRemovalEnabled && !!imageToProcess,
    });
    onAddSingle(sku);
    form.reset();
    setStagedImage(null);
    setNameValue("");
    setSuggestions([]);
    setSuggestError(null);
    setSuggestLoading(false);
    setLastQuery("");

    if (bgRemovalEnabled && imageToProcess) {
      try {
        const processed = await removeBg(imageToProcess);
        onUpdate(sku.id, { processedImage: processed, isProcessingImage: false });
      } catch {
        onUpdate(sku.id, { isProcessingImage: false });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setMode("paste")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === "paste"
              ? "text-accent border-b-2 border-accent bg-accent-light/50"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Paste from Spreadsheet
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "text-accent border-b-2 border-accent bg-accent-light/50"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Add Manually
        </button>
      </div>

      <div className="p-4">
        {mode === "paste" ? (
          <div className="space-y-3">
            <div>
              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder={`Paste tab-separated data here:\n\nProduct Name\tMSRP\tOffer Price\nLuka Duffel\t299\t167.44\nLuka Mini\t199\t111.44`}
                className="w-full h-32 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none placeholder:text-gray-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Columns: Product Name, MSRP, Offer Price
              </p>
              {!pasteValue && (
                <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
                  Example: Luka Duffel	$299	$167.44
                </p>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={!pasteValue.trim()}
              className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Import SKUs
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddManual} className="space-y-3">
            <input
              name="name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="Product Name"
              required
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
            {(suggestLoading || suggestions.length > 0 || suggestError) && (
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400">Suggested images</span>
                {suggestLoading ? (
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1/3 h-20 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : suggestError && suggestions.length === 0 ? (
                  <p className="text-[10px] text-gray-300">{suggestError}</p>
                ) : (
                  <div className="flex gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSuggestionClick(s.dataUrl)}
                        className={`w-1/3 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                          stagedImage === s.dataUrl
                            ? "border-accent"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img src={s.dataUrl} alt={s.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {nameValue.trim().length >= 3 && suggestions.length === 0 && !suggestLoading && !suggestError && (
              <button
                type="button"
                onClick={() => fetchSuggestions(nameValue.trim())}
                className="text-[10px] text-gray-300 hover:text-accent transition-colors w-full text-center"
              >
                Suggest product images
              </button>
            )}
            <ImageDropzone
              image={stagedImage ?? undefined}
              onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
              compact
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="msrp"
                type="number"
                step="0.01"
                placeholder="MSRP"
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Offer Price"
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Add SKU
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
