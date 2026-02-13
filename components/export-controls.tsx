"use client";

import { useEffect, useRef, useState } from "react";
import { type SKU } from "@/types/sku";
import { exportToPng, copyToClipboard, generatePreview } from "@/lib/export-image";

interface ExportControlsProps {
  skus: SKU[];
  disabled: boolean;
}

export function ExportControls({ skus, disabled }: ExportControlsProps) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewAction, setPreviewAction] = useState<"download" | "copy" | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isProcessing = skus.some((s) => s.isProcessingImage);
  const isDisabled = disabled || isProcessing;
  const isConfirming = downloading || copying;

  useEffect(() => {
    if (!preview) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreview(null);
        setPreviewAction(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handlePreview = async (action: "download" | "copy") => {
    setPreviewAction(action);
    try {
      const dataUrl = await generatePreview(skus);
      setPreview(dataUrl);
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewAction(null);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    if (previewAction === "download") {
      setDownloading(true);
      try {
        await exportToPng(skus);
      } catch (err) {
        console.error("Export failed:", err);
      }
      setDownloading(false);
    } else {
      setCopying(true);
      try {
        await copyToClipboard(skus);
        setCopied(true);
        if (copiedTimeoutRef.current) {
          clearTimeout(copiedTimeoutRef.current);
        }
        copiedTimeoutRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimeoutRef.current = null;
        }, 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
      setCopying(false);
    }
    setPreview(null);
    setPreviewAction(null);
  };

  const handleDismiss = () => {
    setPreview(null);
    setPreviewAction(null);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => handlePreview("download")}
            disabled={isDisabled || downloading}
            className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => handlePreview("copy")}
            disabled={isDisabled || copying}
            className="flex-1 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : copying ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
          {isProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 shrink-0">
              <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          )}
        </div>
      </div>
      {/* Spacer so content doesn't hide behind fixed bar */}
      <div className="h-16" />

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8" onClick={handleDismiss}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[80vh] overflow-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Export Preview</h3>
              <button type="button" onClick={handleDismiss} aria-label="Close export preview" className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Export preview" className="w-full rounded-lg border border-gray-100" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={handleDismiss} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!previewAction || isConfirming}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {previewAction === "download" ? "Download" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
