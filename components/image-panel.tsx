"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isImageSuggestion, type ImageSuggestion } from "@/types/suggest-images";

interface ImagePanelProps {
  query: string;
  onImageSelected: (dataUrl: string) => void;
}

const INITIAL_COUNT = 3;
const MORE_COUNT = 7;

export function ImagePanel({ query, onImageSelected }: ImagePanelProps) {
  const abortRef = useRef<AbortController | null>(null);
  const fullResAbortRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (query.length < 3) return;

    abortRef.current?.abort();
    fullResAbortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSuggestions([]);
    setLoading(true);
    setError(null);
    setVisibleCount(INITIAL_COUNT);
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
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("suggest-images error:", e);
        setError("Couldn't load suggestions");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      fullResAbortRef.current?.abort();
    };
  }, []);

  const handleThumbnailClick = useCallback(
    async (suggestion: ImageSuggestion, index: number) => {
      if (loadingIndex !== null) return;

      fullResAbortRef.current?.abort();
      const controller = new AbortController();
      fullResAbortRef.current = controller;

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
    },
    [loadingIndex, onImageSelected]
  );

  const visibleSuggestions = suggestions.slice(0, visibleCount);
  const hasMore = suggestions.length > visibleCount;
  const showMoreButton = hasMore && !loading;

  return (
    <div className="space-y-2">
      {error && suggestions.length === 0 && (
        <p className="text-xs text-gray-400">{error}</p>
      )}

      {loading && suggestions.length === 0 && (
        <div className="flex items-center gap-2 py-3">
          <div className="w-3.5 h-3.5 border-2 border-accent/40 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Finding images...</p>
        </div>
      )}

      {visibleSuggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 suggestion-scroll">
          {visibleSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleThumbnailClick(s, i)}
              disabled={loadingIndex !== null}
              className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2
                         border-gray-200 hover:border-accent transition-all
                         disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              <img src={s.dataUrl} alt={s.title} className="w-full h-full object-cover" />
              {loadingIndex === i && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          ))}

          {showMoreButton && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + MORE_COUNT)}
              className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-gray-200
                         flex items-center justify-center text-[10px] text-gray-400
                         hover:border-accent hover:text-accent transition-colors"
            >
              More
            </button>
          )}

          {loading && suggestions.length > 0 && (
            <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-100 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}
