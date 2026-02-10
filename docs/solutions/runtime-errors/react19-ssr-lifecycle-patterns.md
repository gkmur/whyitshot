---
title: "React 19 + Next.js SSR Lifecycle Patterns"
category: runtime-errors
tags:
  - react-19
  - next-js
  - ssr
  - localStorage
  - stale-closures
  - abort-controller
  - useRef
  - autosave
  - validation
module:
  - lib/storage.ts
  - lib/use-autosave.ts
  - components/card-grid.tsx
  - components/image-dropzone.tsx
  - app/page.tsx
symptom:
  - "Build failure: localStorage.getItem is not a function during SSR"
  - "Type error: useRef requires initial value in React 19"
  - "Drag reorder lands on wrong slot during fast drags"
  - "Data loss on navigation within autosave debounce window"
  - "State updates on unmounted component during image fetch"
  - "Undo button dismissed prematurely on double-clear"
  - "Tampered localStorage bypasses type checks"
root_cause: "SSR/client lifecycle mismatches, stale closures, missing cleanup, insufficient validation"
date: 2026-02-10
severity: high
stack:
  - Next.js 16.1.6 (Turbopack)
  - React 19
  - TypeScript (strict)
  - Tailwind CSS v4
---

# React 19 + Next.js SSR Lifecycle Patterns

Seven client-side issues discovered during review of the Top SKUs Visual Generator v2 feature branch. All stem from a common theme: managing side effects and data persistence across the React 19 lifecycle with SSR constraints.

## 1. SSR localStorage Error

**Symptom:** `TypeError: localStorage.getItem is not a function` during `next build`

**Root Cause:** `loadSession()` called in a `useState` initializer executes during Next.js static generation where `localStorage` doesn't exist.

**Fix:** Guard all storage functions:

```typescript
export function loadSession(): SKU[] | null {
  if (typeof window === "undefined") return null;
  // ...
}

export function saveSession(skus: SKU[]): boolean {
  if (typeof window === "undefined") return false;
  // ...
}
```

**Pattern:** Any browser-only API (`localStorage`, `window`, `document`) accessed at render time needs a `typeof window === "undefined"` guard or must be called inside `useEffect`.

## 2. React 19 useRef Breaking Change

**Symptom:** `Type error: Expected 1 arguments, but got 0` for `useRef<ReturnType<typeof setTimeout>>()`

**Root Cause:** React 19 requires `useRef` to have an explicit initial value.

**Fix:**

```typescript
// React 18 (worked)
const ref = useRef<ReturnType<typeof setTimeout>>();

// React 19 (required)
const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Pattern:** Always provide an initial value to `useRef`. Add `| null` to the type and pass `null` for refs assigned later.

## 3. Stale Closure in Drag-End Handler

**Symptom:** Fast drags reorder to wrong slot or silently do nothing.

**Root Cause:** `handleDragEnd` closes over `overIndex` state. When `handleDragMove` calls `setOverIndex()` and `handleDragEnd` fires in the same event loop, it reads the stale value from the previous render.

**Fix:** Mirror the value in a ref:

```typescript
const overIndexRef = useRef<number | null>(null);

const handleDragMove = (e: React.PointerEvent) => {
  const closest = calculateClosest(e);
  overIndexRef.current = closest;  // ref always current
  setOverIndex(closest);           // state for visual feedback
};

const handleDragEnd = () => {
  const over = overIndexRef.current;  // reads current, not stale
  if (dragRef.current !== null && over !== null && over !== dragRef.current.index) {
    onReorder(dragRef.current.index, over);
  }
  // reset
};
```

**Pattern:** When event handlers need the latest value and React state batching causes staleness, use a ref as the source of truth for the handler and state only for rendering.

## 4. Autosave Data Loss on Unmount

**Symptom:** Edit data, navigate within 500ms, data is lost.

**Root Cause:** `useEffect` cleanup only cleared the debounce timeout but didn't flush the pending save.

**Fix:** Track latest value in a ref and flush on cleanup:

```typescript
const latestRef = useRef(skus);
latestRef.current = skus;

useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  if (timeoutRef.current) clearTimeout(timeoutRef.current);

  timeoutRef.current = setTimeout(() => {
    saveSession(latestRef.current);
  }, delay);

  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    saveSession(latestRef.current);  // flush on unmount
  };
}, [skus, delay]);
```

**Pattern:** Any debounced write operation must flush pending data in the cleanup function. Use a ref to avoid stale closure reads in the flush.

## 5. Unabortable Image Fetch

**Symptom:** Removing a card during a slow image fetch causes state updates on an unmounted component.

**Root Cause:** No `AbortController` on the URL fetch in `image-dropzone.tsx`.

**Fix:**

```typescript
const abortRef = useRef<AbortController | null>(null);

useEffect(() => {
  return () => { abortRef.current?.abort(); };
}, []);

const handleUrlSubmit = async () => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const response = await fetch(url, { signal: controller.signal });
    // ...
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    // handle real errors
  }
};
```

Also validate URL scheme before fetching:

```typescript
const parsed = new URL(url);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  setUrlError("Only https:// and http:// URLs are supported.");
  return;
}
```

**Pattern:** Every `fetch` in a component should use an `AbortController`. Abort previous requests on new submissions and abort on unmount via `useEffect` cleanup.

## 6. Orphaned Undo Timeout

**Symptom:** Double-clear causes premature undo button dismissal.

**Root Cause:** `setTimeout` was fire-and-forget with no stored reference. Two concurrent timeouts race.

**Fix:**

```typescript
const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleClear = () => {
  lastClearedRef.current = skus;
  setSkus([]);
  setShowUndo(true);
  if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  undoTimeoutRef.current = setTimeout(() => setShowUndo(false), 5000);
};
```

**Pattern:** Always store timeout/interval IDs in refs. Clear previous timers before setting new ones. Clean up in `useEffect` return if the timer outlives the component.

## 7. Incomplete localStorage Validation

**Symptom:** Tampered localStorage could inject non-number values that reach `innerHTML` in the export module.

**Root Cause:** `isSessionData` validated the envelope (`version === 1` + `Array.isArray(skus)`) but not individual field types.

**Fix:** Add field-level runtime validation:

```typescript
function isValidSKU(v: unknown): v is { id: string; name: string; msrp: number; offerPrice: number; units?: number } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.msrp === "number" &&
    typeof o.offerPrice === "number" &&
    (o.units === undefined || typeof o.units === "number")
  );
}

// In loadSession:
return parsed.skus.filter(isValidSKU).map((s) => ({
  id: s.id, name: s.name, msrp: s.msrp, offerPrice: s.offerPrice,
  ...(s.units !== undefined ? { units: s.units } : {}),
}));
```

**Pattern:** Never trust `JSON.parse` output. Validate parsed data as `unknown` with type guards before use. Filter invalid entries rather than crashing.

## Prevention Quick Reference

| Category | Trigger | Fix |
|----------|---------|-----|
| SSR/Browser API | Build error "X is not defined" | `typeof window === "undefined"` guard |
| React 19 useRef | TypeScript error on `useRef()` | Always pass initial value: `useRef(null)` |
| Stale closures | Event handler reads old state | Mirror value in ref, read ref in handler |
| Unmount data loss | Data vanishes on navigation | Flush pending writes in cleanup |
| Missing cancellation | State update on unmounted component | `AbortController` + cleanup abort |
| Timer leak | Premature dismissal, console warnings | Store timer ID in ref, clear before reset |
| Invalid JSON | Type errors from localStorage | Validate with type guards, filter invalid |

## Related Documentation

- [html-to-image export failure](/docs/solutions/build-errors/html-to-image-hidden-element-export-failure.md) — append-capture-remove pattern for DOM export
- [v2 plan](/docs/plans/2026-02-10-feat-top-skus-v2-design-persistence-onboarding-plan.md) — full feature plan with edge case analysis
