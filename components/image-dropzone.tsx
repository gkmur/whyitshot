"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImageDropzoneProps {
  image?: string;
  isProcessing?: boolean;
  onImageSelected: (dataUrl: string) => void;
  compact?: boolean;
}

function isUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function fetchImageViaProxy(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/proxy-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });
  if (!res.ok) throw new Error("Failed to fetch image");
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export function ImageDropzone({
  image,
  isProcessing,
  onImageSelected,
  compact,
}: ImageDropzoneProps) {
  const sizeClass = compact ? "h-28" : "aspect-square";
  const [isDragging, setIsDragging] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      // Check for image files first
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { handleFile(file); return; }
        }
      }
      // Check for URL text
      const text = e.clipboardData.getData("text");
      if (text && isUrl(text)) {
        e.preventDefault();
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setUrlLoading(true);
        try {
          const dataUrl = await fetchImageViaProxy(text.trim(), controller.signal);
          if (!controller.signal.aborted) onImageSelected(dataUrl);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        } finally {
          if (abortRef.current === controller) {
            setUrlLoading(false);
          }
        }
      }
    },
    [handleFile, onImageSelected]
  );

  const handleImageKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      imageInputRef.current?.click();
    }
  }, []);

  const handleEmptyKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      emptyInputRef.current?.click();
    }
  }, []);

  if (isProcessing) {
    return (
      <div className={`${sizeClass} bg-gray-50 flex items-center justify-center rounded-lg`}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-gray-400">Removing bg...</span>
        </div>
      </div>
    );
  }

  if (urlLoading) {
    return (
      <div className={`${sizeClass} bg-gray-50 flex items-center justify-center rounded-lg`}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-accent/40 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-gray-400">Loading image...</span>
        </div>
      </div>
    );
  }

  if (image) {
    return (
      <div
        className={`${sizeClass} bg-white flex items-center justify-center rounded-lg relative group cursor-pointer overflow-hidden`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onPaste={handlePaste}
        onKeyDown={handleImageKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Replace product image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Product" className="max-w-full max-h-full object-contain p-2" />
        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
          <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">Replace</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </label>
      </div>
    );
  }

  return (
    <label
      className={`${sizeClass} border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
        isDragging
          ? "border-accent bg-accent-light"
          : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onPaste={handlePaste}
      onKeyDown={handleEmptyKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Add product image"
    >
      <div className="text-center px-2">
        <svg
          className="w-6 h-6 mx-auto mb-1 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[11px] text-gray-400 leading-tight block">
          Drop, paste image or URL
        </span>
      </div>
      <input
        ref={emptyInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
      />
    </label>
  );
}
