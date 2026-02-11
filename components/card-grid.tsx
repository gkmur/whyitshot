"use client";

import { useRef, useState, useEffect } from "react";
import { type SKU } from "@/types/sku";
import { ProductCard } from "./product-card";

interface CardGridProps {
  skus: SKU[];
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  onImageSelected: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function CardGrid({
  skus,
  onUpdate,
  onImageSelected,
  onRemove,
  onReorder,
}: CardGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragRef = useRef<{ index: number } | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const rectsRef = useRef<{ index: number; centerY: number }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(skus.length);
  const [newId, setNewId] = useState<string | null>(null);

  // Detect new card and scroll to it
  useEffect(() => {
    if (skus.length > prevCountRef.current) {
      const newest = skus[skus.length - 1];
      setNewId(newest.id);
      const timer = setTimeout(() => setNewId(null), 350);

      requestAnimationFrame(() => {
        const el = gridRef.current?.querySelector(`[data-card-id="${newest.id}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      prevCountRef.current = skus.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = skus.length;
  }, [skus]);

  if (skus.length === 0) return null;

  const handleDragStart = (index: number) => (e: React.PointerEvent) => {
    if (skus.length <= 1) return;
    dragRef.current = { index };
    setDragIndex(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Cache bounding rects once at drag start
    if (gridRef.current) {
      const elements = gridRef.current.querySelectorAll("[data-card-index]");
      rectsRef.current = Array.from(elements).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          index: parseInt(el.getAttribute("data-card-index") || "0", 10),
          centerY: rect.top + rect.height / 2,
        };
      });
    }
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (dragRef.current === null) return;
    let closest = dragRef.current.index;
    let closestDist = Infinity;
    for (const cached of rectsRef.current) {
      const dist = Math.abs(e.clientY - cached.centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = cached.index;
      }
    }
    overIndexRef.current = closest;
    setOverIndex(closest);
  };

  const handleDragEnd = () => {
    const over = overIndexRef.current;
    if (dragRef.current !== null && over !== null && over !== dragRef.current.index) {
      onReorder(dragRef.current.index, over);
    }
    dragRef.current = null;
    overIndexRef.current = null;
    rectsRef.current = [];
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[720px] mx-auto"
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
    >
      {skus.map((sku, i) => (
        <div
          key={sku.id}
          data-card-index={i}
          data-card-id={sku.id}
          className={`relative group transition-transform ${
            dragIndex === i ? "scale-105 opacity-70 z-10 shadow-lg" : ""
          } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-accent/30 rounded-2xl" : ""}`}
          style={newId === sku.id ? { animation: "var(--animate-card-in)" } : undefined}
        >
          {skus.length > 1 && (
            <div
              onPointerDown={handleDragStart(i)}
              className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
              style={{ touchAction: "none" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="4" cy="2" r="1" />
                <circle cx="8" cy="2" r="1" />
                <circle cx="4" cy="6" r="1" />
                <circle cx="8" cy="6" r="1" />
                <circle cx="4" cy="10" r="1" />
                <circle cx="8" cy="10" r="1" />
              </svg>
            </div>
          )}
          <ProductCard
            sku={sku}
            onUpdate={onUpdate}
            onImageSelected={onImageSelected}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>
  );
}
