"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type ImageCrop, DEFAULT_CROP } from "@/types/sku";

interface ImageDropzoneProps {
  image?: string;
  isProcessing?: boolean;
  onImageSelected: (dataUrl: string) => void;
  compact?: boolean;
  crop?: ImageCrop;
  onCropChange?: (crop: ImageCrop) => void;
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
  crop,
  onCropChange,
}: ImageDropzoneProps) {
  const sizeClass = compact ? "h-28" : "aspect-square";
  const [isDragging, setIsDragging] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCrop = crop ?? DEFAULT_CROP;

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
          setUrlLoading(false);
        }
      }
    },
    [handleFile, onImageSelected]
  );

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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!onCropChange) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(1, Math.min(4, activeCrop.zoom + delta));
      // When zooming out, pull position back toward center
      const maxPan = ((newZoom - 1) / newZoom) * 50;
      const newX = Math.max(-maxPan, Math.min(maxPan, activeCrop.x));
      const newY = Math.max(-maxPan, Math.min(maxPan, activeCrop.y));
      onCropChange({ zoom: newZoom, x: newX, y: newY });
    },
    [activeCrop, onCropChange]
  );

  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
      if (!onCropChange || activeCrop.zoom <= 1) return;
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, cropX: activeCrop.x, cropY: activeCrop.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [activeCrop, onCropChange]
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning || !panStartRef.current || !onCropChange || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - panStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - panStartRef.current.y) / rect.height) * 100;
      const maxPan = ((activeCrop.zoom - 1) / activeCrop.zoom) * 50;
      const newX = Math.max(-maxPan, Math.min(maxPan, panStartRef.current.cropX + dx));
      const newY = Math.max(-maxPan, Math.min(maxPan, panStartRef.current.cropY + dy));
      onCropChange({ zoom: activeCrop.zoom, x: newX, y: newY });
    },
    [isPanning, activeCrop.zoom, onCropChange]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  if (image) {
    const isZoomed = activeCrop.zoom > 1;
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-white flex items-center justify-center rounded-lg relative group overflow-hidden ${
          isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onPaste={handlePaste}
        onWheel={handleWheel}
        onPointerDown={isZoomed ? handlePanStart : undefined}
        onPointerMove={isPanning ? handlePanMove : undefined}
        onPointerUp={isPanning ? handlePanEnd : undefined}
        onPointerCancel={isPanning ? handlePanEnd : undefined}
        tabIndex={0}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt="Product"
          className="max-w-full max-h-full object-contain p-2 select-none pointer-events-none"
          draggable={false}
          style={{
            transform: `scale(${activeCrop.zoom}) translate(${activeCrop.x}%, ${activeCrop.y}%)`,
            transformOrigin: "center center",
          }}
        />
        {!isPanning && !isZoomed && (
          <label className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
            <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">Replace</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
            />
          </label>
        )}
        {isZoomed && (
          <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {Math.round(activeCrop.zoom * 100)}%
          </div>
        )}
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
      tabIndex={0}
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
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
      />
    </label>
  );
}
