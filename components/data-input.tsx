"use client";

import { useState } from "react";
import { parseTSV } from "@/lib/parse-tsv";
import { createSKU, type SKU } from "@/types/sku";
import { ImageDropzone } from "./image-dropzone";
import { removeBg } from "@/lib/remove-bg";

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

  const handleImport = () => {
    const skus = parseTSV(pasteValue);
    if (skus.length > 0) {
      onImport(skus);
      setPasteValue("");
    }
  };

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
              placeholder="Product Name"
              required
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
            <div className="h-32">
              <ImageDropzone
                image={stagedImage ?? undefined}
                onImageSelected={(dataUrl) => setStagedImage(dataUrl)}
              />
            </div>
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
