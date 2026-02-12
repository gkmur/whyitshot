"use client";

import { useRef, useState, useEffect } from "react";
import { type SKU } from "@/types/sku";
import { ProductCard } from "./product-card";

interface CardGridProps {
  skus: SKU[];
  onUpdate: (id: string, updates: Partial<SKU>) => void;
  onImageSelected: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
  onClearImage: (id: string) => void;
  onRemoveBg: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function CardGrid({
  skus,
  onUpdate,
  onImageSelected,
  onRemove,
  onClearImage,
  onRemoveBg,
  onReorder,
}: CardGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragRef = useRef<{ index: number } | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const rectsRef = useRef<{ index: number; centerY: number }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const prevIdsRef = useRef<Set<string>>(new Set(skus.map((s) => s.id)));
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Detect new cards by diffing ID sets
  useEffect(() => {
    const currentIds = new Set(skus.map((s) => s.id));
    const added = new Set<string>();
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) added.add(id);
    }
    prevIdsRef.current = currentIds;

    if (added.size === 0) return;
    const timer = setTimeout(() => setNewIds(new Set()), 500);

    const rafId = requestAnimationFrame(() => {
      setNewIds(added);
      const lastNew = skus.filter((s) => added.has(s.id)).pop();
      if (lastNew) {
        const el = gridRef.current?.querySelector(`[data-card-id="${lastNew.id}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
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
      {skus.map((sku, i) => {
        const isDragging = dragIndex === i;
        const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i;
        const isNew = newIds.has(sku.id);
        const newIndex = isNew ? [...newIds].indexOf(sku.id) : -1;

        return (
        <div
          key={sku.id}
          data-card-index={i}
          data-card-id={sku.id}
          className={`relative group shadow-sm ${
            isDragging
              ? "scale-105 opacity-70 z-10 shadow-xl"
              : dragIndex !== null
                ? ""
                : "hover:scale-[1.008] hover:shadow-md transition-transform transition-shadow duration-200"
          } ${isDropTarget ? "ring-2 ring-accent/30 rounded-2xl scale-[1.01]" : ""}`}
          style={isNew ? { animation: "var(--animate-card-in)", animationDelay: `${newIndex * 80}ms` } : undefined}
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
            onClearImage={onClearImage}
            onRemoveBg={onRemoveBg}
          />
        </div>
        );
      })}
    </div>
  );
}
