"use client";

import { useState } from "react";
import { type HotSheet } from "@/types/hot-sheet";
import {
  copyTextToClipboard,
  copySkuImageToClipboard,
  filledSectionCount,
  TOTAL_SECTIONS,
} from "@/lib/hot-sheet-export";

interface ExportControlsProps {
  sheet: HotSheet;
}

export function ExportControls({ sheet }: ExportControlsProps) {
  const [textCopying, setTextCopying] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [imgCopying, setImgCopying] = useState(false);
  const [imgCopied, setImgCopied] = useState(false);

  const filled = filledSectionCount(sheet);
  const hasSkus = sheet.topSkus.some((s) => s.name.trim().length > 0);

  const handleCopyText = async () => {
    setTextCopying(true);
    try {
      await copyTextToClipboard(sheet);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } catch (err) {
      console.error("Copy text failed:", err);
    }
    setTextCopying(false);
  };

  const handleCopyImage = async () => {
    setImgCopying(true);
    try {
      await copySkuImageToClipboard(sheet.topSkus);
      setImgCopied(true);
      setTimeout(() => setImgCopied(false), 2000);
    } catch (err) {
      console.error("Copy SKU image failed:", err);
    }
    setImgCopying(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <span className="text-xs text-gray-400 mr-auto">
            {filled}/{TOTAL_SECTIONS} sections
          </span>

          <button
            onClick={handleCopyText}
            disabled={filled === 0 || textCopying}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {textCopied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : textCopying ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Copy Text"
            )}
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!hasSkus || imgCopying}
            className="px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {imgCopied ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : imgCopying ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Copy SKU Image"
            )}
          </button>
        </div>
      </div>
      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}
