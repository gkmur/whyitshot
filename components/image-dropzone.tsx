"use client";

import { useCallback, useState } from "react";

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

  if (isProcessing) {
    return (
      <div className="aspect-square bg-gray-50 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
    <label
      className={`aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
        isDragging
          ? "border-orange-400 bg-orange-50"
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
          Drop image
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
  );
}
