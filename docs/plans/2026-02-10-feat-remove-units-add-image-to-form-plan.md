---
title: "Remove Units Field, Add Image Upload to Manual Add Form"
type: feat
date: 2026-02-10
---

# Remove Units Field, Add Image Upload to Manual Add Form

Two scoped changes: strip the `units` field from the entire data model, and let users attach an image when manually adding a SKU.

## Part 1: Remove Units

Remove `units` everywhere — type, input, display, export, parsing, storage.

### Files to modify

- [x] **types/sku.ts:6** — Remove `units?: number` from SKU interface
- [x] **components/data-input.tsx** — Remove units input field (line 115-120), remove units from form handler (lines 32-34), update placeholder text (line 72) and helper text (line 76) to 3-column format, update example (line 80)
- [x] **components/product-card.tsx:63-68** — Remove conditional units display block
- [x] **lib/export-image.ts:54-56** — Remove conditional units rendering in export
- [x] **lib/parse-tsv.ts:17,19** — Stop parsing 4th column as units; silently ignore extra columns
- [x] **lib/storage.ts** — Remove units from `isValidSKU` type guard (line 5, 13), remove units spread in loadSession (line 46)

### Layout change

The manual form currently uses `grid-cols-3` for MSRP / Offer Price / Units. After removing units, change to `grid-cols-2` for MSRP / Offer Price.

### Backward compatibility

Old localStorage data with `units` field will be silently ignored — `isValidSKU` will stop checking for it, and the destructured return in `loadSession` won't include it. No migration needed.

TSV paste with 4+ columns will silently ignore extra columns (current behavior of `cols[3]` just won't be used).

## Part 2: Add Image to Manual Add Form

Add an image dropzone to the manual "Add SKU" form so users can attach a product image before submitting.

### Approach

Reuse the existing `ImageDropzone` component inside the manual add form. It already handles drag-drop, file picker, paste, and URL input. Place it between the product name field and the price fields.

### Form flow

1. User fills in name, MSRP, offer price
2. User optionally drops/selects/pastes an image into the dropzone
3. User clicks "Add SKU"
4. SKU is created with `imageUrl` and `isProcessingImage` already set (if image + bg removal enabled)
5. `onAddSingle(sku)` adds it to the grid — SKU appears with image and processing indicator
6. If bg removal is enabled, `removeBg` is called directly and `onUpdate` patches the SKU when done
7. Form resets (including clearing the staged image)

### Race condition prevention

Do NOT call `handleImageSelected` after `onAddSingle` — React batches state updates, so the second `setSkus` may not find the new SKU in `prev`. Instead:
- Create the SKU with `isProcessingImage: true` already set in `createSKU`
- Call `removeBg` directly in the submit handler
- Use `onUpdate(sku.id, { processedImage, isProcessingImage: false })` when bg removal completes

This avoids the two-`setSkus`-in-a-row race entirely.

### Files to modify

- [x] **components/data-input.tsx** — Add state for staged image (`stagedImage: string | null`). Import and render `ImageDropzone` in the form. On form submit, create SKU with `imageUrl` and `isProcessingImage` set. Call `removeBg` directly if bg removal enabled. Use `onUpdate` to patch SKU when bg removal completes. Update `DataInputProps` to include `onUpdate` and `bgRemovalEnabled`.
- [x] **app/page.tsx** — Pass `handleUpdate` and `bgRemovalEnabled` to `DataInput`

### Image in form details

- Image is **optional** — submit button is always enabled when name is filled
- Dropzone is compact (not full aspect-square) — use a smaller height like `h-32` with the same drop/click/paste interactions
- On form reset after submit, clear staged image state
- If user submits while FileReader is still reading, the image is simply not included (no blocking)
- The existing ImageDropzone already handles all upload methods (file, drag, paste, URL)

### Staged image state

```typescript
const [stagedImage, setStagedImage] = useState<string | null>(null);
```

Pass to ImageDropzone as `image={stagedImage}` and `onImageSelected={(dataUrl) => setStagedImage(dataUrl)}`. On form submit, include in SKU creation. On form reset, call `setStagedImage(null)`.

### Bg removal in submit handler

```typescript
const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const sku = createSKU({
    name: (data.get("name") as string) || "Untitled",
    msrp: parseFloat(data.get("msrp") as string) || 0,
    offerPrice: parseFloat(data.get("price") as string) || 0,
    imageUrl: stagedImage ?? undefined,
    isProcessingImage: bgRemovalEnabled && !!stagedImage,
  });
  onAddSingle(sku);
  form.reset();
  setStagedImage(null);

  if (bgRemovalEnabled && stagedImage) {
    try {
      const processed = await removeBg(stagedImage);
      onUpdate(sku.id, { processedImage: processed, isProcessingImage: false });
    } catch {
      onUpdate(sku.id, { isProcessingImage: false });
    }
  }
};
```

## Acceptance Criteria

- [x] `units` field is completely removed from the codebase (type, form, display, export, parse, storage)
- [x] Manual add form grid changes from 3-col to 2-col for price fields
- [x] TSV paste with extra columns still works (silently ignores)
- [x] Old localStorage data with units loads without errors
- [x] Manual add form includes an image dropzone
- [x] Image is optional — form submits without image
- [x] Submitted SKU appears in grid with image already attached
- [x] If bg removal is enabled, it processes the image after SKU creation
- [x] Form fully resets (including image) after submission

## References

- ImageDropzone component: `components/image-dropzone.tsx`
- SKU type: `types/sku.ts`
- Data input: `components/data-input.tsx`
- Existing bg removal flow: `app/page.tsx:39-69`
- React 19 lifecycle patterns: `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md`
