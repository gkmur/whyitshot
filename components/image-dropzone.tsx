"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImageDropzoneProps {
  image?: string;
  isProcessing?: boolean;
  onImageSelected: (dataUrl: string) => void;
}

export function ImageDropzone({
  image,
  isProcessing,
  onImageSelected,
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    },
    [handleFile]
  );

  const handleUrlSubmit = async () => {
    const url = urlValue.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        setUrlError("Only https:// and http:// URLs are supported.");
        return;
      }
    } catch {
      setUrlError("Invalid URL.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setUrlError("");
    setUrlLoading(true);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to fetch");
      const contentType = response.headers.get("content-type");
      if (!contentType?.startsWith("image/")) throw new Error("Not an image");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSelected(reader.result);
          setShowUrlInput(false);
          setUrlValue("");
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setUrlError("Couldn't load that URL. Try downloading the image and dragging it here.");
    } finally {
      setUrlLoading(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="aspect-square bg-gray-50 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-gray-400">Removing bg...</span>
        </div>
      </div>
    );
  }

  if (image) {
    return (
      <div
        className="aspect-square bg-white flex items-center justify-center rounded-lg relative group cursor-pointer overflow-hidden"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onPaste={handlePaste}
        tabIndex={0}
      >
        <img
          src={image}
          alt="Product"
          className="max-w-full max-h-full object-contain p-2"
        />
        <label className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
          <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
            Replace
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label
        className={`aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
          isDragging
            ? "border-accent bg-accent-light"
            : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-[11px] text-gray-400 leading-tight block">
            Drop image or click
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {!showUrlInput ? (
        <button
          onClick={() => setShowUrlInput(true)}
          className="text-[10px] text-gray-300 hover:text-accent transition-colors w-full text-center"
        >
          or paste URL
        </button>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => { setUrlValue(e.target.value); setUrlError(""); }}
              placeholder="https://..."
              className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-accent"
              onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
            />
            <button
              onClick={handleUrlSubmit}
              disabled={urlLoading || !urlValue.trim()}
              className="text-[10px] bg-accent text-white rounded px-2 py-1 disabled:opacity-40"
            >
              {urlLoading ? "..." : "Go"}
            </button>
          </div>
          {urlError && (
            <p className="text-[10px] text-red-400">{urlError}</p>
          )}
        </div>
      )}
    </div>
  );
}
