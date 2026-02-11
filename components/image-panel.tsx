"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isImageSuggestion, type ImageSuggestion } from "@/types/suggest-images";

interface ImagePanelProps {
  query: string;
  open: boolean;
  onClose: () => void;
  onImageSelected: (dataUrl: string) => void;
}

const VISIBLE_STEP = 5;

export function ImagePanel({ query, open, onClose, onImageSelected }: ImagePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullResAbortRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const lastQueryRef = useRef("");

  // Sync dialog open/close with prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fetch suggestions when query changes and panel is open
  useEffect(() => {
    if (!open || query.length < 3 || query === lastQueryRef.current) return;
    lastQueryRef.current = query;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSuggestions([]);
    setLoading(true);
    setError(null);
    setVisibleCount(VISIBLE_STEP);
    setLoadingIndex(null);

    (async () => {
      try {
        const res = await fetch("/api/suggest-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error("Search failed");
        if (!res.body) throw new Error("Empty response");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let count = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) {
            reader.cancel();
            return;
          }

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          const batch: ImageSuggestion[] = [];
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed: unknown = JSON.parse(line);
              if (isImageSuggestion(parsed)) {
                batch.push(parsed);
                count++;
              }
            } catch {
              // malformed line, skip
            }
          }
          if (batch.length > 0) {
            setSuggestions((prev) => [...prev, ...batch]);
          }
        }

        if (count === 0) setError("No images found");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Couldn't load suggestions");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, query]);

  // Reset when panel closes
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      fullResAbortRef.current?.abort();
      lastQueryRef.current = "";
    }
  }, [open]);

  const handleThumbnailClick = useCallback(
    async (suggestion: ImageSuggestion, index: number) => {
      if (loadingIndex !== null) return;

      fullResAbortRef.current?.abort();
      const controller = new AbortController();
      fullResAbortRef.current = controller;

      // Try full-res via proxy, fall back to thumbnail
      if (suggestion.originalUrl) {
        setLoadingIndex(index);
        try {
          const res = await fetch("/api/proxy-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: suggestion.originalUrl }),
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (res.ok) {
            const blob = await res.blob();
            if (controller.signal.aborted) return;
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            onImageSelected(dataUrl);
            onClose();
            setLoadingIndex(null);
            return;
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setLoadingIndex(null);
            return;
          }
        }
        setLoadingIndex(null);
      }

      onImageSelected(suggestion.dataUrl);
      onClose();
    },
    [loadingIndex, onImageSelected, onClose]
  );

  const visibleSuggestions = suggestions.slice(0, visibleCount);
  const hasMore = suggestions.length > visibleCount;
  const showMoreButton = hasMore && !loading;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-y-0 right-0 m-0 h-screen w-80 max-w-[90vw] bg-white border-l border-gray-200 shadow-xl p-0 backdrop:bg-black/20 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Image suggestions</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && suggestions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">{error}</p>
          )}

          {visibleSuggestions.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {visibleSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleThumbnailClick(s, i)}
                  disabled={loadingIndex !== null}
                  className="relative h-28 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-accent transition-colors disabled:opacity-50"
                >
                  <img src={s.dataUrl} alt={s.title} className="w-full h-full object-cover" />
                  {loadingIndex === i && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: Math.max(0, VISIBLE_STEP - visibleSuggestions.length) }).map((_, i) => (
                <div key={`skel-${i}`} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {showMoreButton && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-accent hover:bg-accent-light rounded-lg transition-colors min-h-[44px]"
            >
              More images
            </button>
          )}

          {loading && suggestions.length > 0 && (
            <p className="text-[10px] text-gray-300 text-center">Loading more...</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
