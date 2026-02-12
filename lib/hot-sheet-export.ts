import { toPng } from "html-to-image";
import { type HotSheet, type HotSheetSKU, type ListingInfo } from "@/types/hot-sheet";
import { formatPrice, percentOff } from "@/lib/format";
import { dataUrlToBlob } from "./blob-url";

// ── Section emptiness checks ──

function hasText(s: string): boolean {
  return s.trim().length > 0;
}

function hasListingInfo(info: ListingInfo): boolean {
  return (
    hasText(info.leadTime) ||
    hasText(info.minOrderValue) ||
    hasText(info.maxOrderValue) ||
    hasText(info.link) ||
    info.availableForDotcom
  );
}

// ── Rich text HTML builder (sections 1–6, no SKU images) ──

export function buildHotSheetHTML(sheet: HotSheet): string {
  const sections: string[] = [];

  // Brand + Retailer heading
  if (hasText(sheet.brandName)) {
    const retailerSuffix = hasText(sheet.retailer) ? ` — ${sheet.retailer}` : "";
    sections.push(
      `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;font-family:Inter,system-ui,sans-serif;">${escapeHtml(sheet.brandName)}${escapeHtml(retailerSuffix)}</h2>`
    );
  }

  // Why It's Hot
  if (hasText(sheet.whyItsHot)) {
    sections.push(sectionBlock("Why It's Hot", proseParagraph(sheet.whyItsHot)));
  }

  // Distribution
  if (hasText(sheet.distribution)) {
    sections.push(sectionBlock("Distribution Channels & Similar Brands", proseParagraph(sheet.distribution)));
  }

  // Listing Info
  if (hasListingInfo(sheet.listingInfo)) {
    const rows: string[] = [];
    const li = sheet.listingInfo;
    if (hasText(li.leadTime)) rows.push(infoRow("Lead Time", li.leadTime));
    if (hasText(li.minOrderValue)) rows.push(infoRow("Min Order", li.minOrderValue));
    if (hasText(li.maxOrderValue)) rows.push(infoRow("Max Order", li.maxOrderValue));
    if (li.availableForDotcom) rows.push(infoRow("Available for .com", "Yes"));
    if (hasText(li.link)) rows.push(infoRow("Link", `<a href="${escapeHtml(li.link)}" style="color:#564ef5;">${escapeHtml(li.link)}</a>`));
    sections.push(sectionBlock("Listing Info", `<table style="border-collapse:collapse;font-size:13px;">${rows.join("")}</table>`));
  }

  // Press & Features
  if (sheet.pressFeatures.length > 0) {
    const items = sheet.pressFeatures
      .filter((p) => hasText(p.text))
      .map((p) => {
        const source = hasText(p.source) ? ` — <em>${escapeHtml(p.source)}</em>` : "";
        const link = p.url && hasText(p.url) ? ` (<a href="${escapeHtml(p.url)}" style="color:#564ef5;">link</a>)` : "";
        return `<li style="margin-bottom:6px;">"${escapeHtml(p.text)}"${source}${link}</li>`;
      });
    if (items.length > 0) {
      sections.push(sectionBlock("Press & Features", `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`));
    }
  }

  // Viral TikToks
  if (sheet.viralTiktoks.length > 0) {
    const items = sheet.viralTiktoks
      .filter((t) => hasText(t.description))
      .map((t) => {
        const stats = hasText(t.stats) ? ` — ${escapeHtml(t.stats)}` : "";
        return `<li style="margin-bottom:6px;">${escapeHtml(t.description)}${stats}</li>`;
      });
    if (items.length > 0) {
      sections.push(sectionBlock("Viral TikToks", `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`));
    }
  }

  // Top SKUs (text-only summary — image is separate)
  if (sheet.topSkus.length > 0) {
    const items = sheet.topSkus
      .filter((s) => hasText(s.name))
      .map((s) => {
        const discount = percentOff(s.msrp, s.offerPrice);
        const discountStr = discount > 0 ? ` (${discount}% off)` : "";
        const ratingStr = s.rating && hasText(s.rating) ? ` | ${escapeHtml(s.rating)}` : "";
        return `<li style="margin-bottom:6px;"><strong>${escapeHtml(s.name)}</strong> — MSRP ${formatPrice(s.msrp)} → ${formatPrice(s.offerPrice)}${discountStr}${ratingStr}</li>`;
      });
    if (items.length > 0) {
      sections.push(sectionBlock("Top SKUs", `<ul style="margin:0;padding-left:20px;">${items.join("")}</ul>`));
    }
  }

  return `<div style="font-family:Inter,system-ui,sans-serif;color:#374151;font-size:14px;line-height:1.6;max-width:640px;">${sections.join("")}</div>`;
}

function sectionBlock(heading: string, content: string): string {
  return `<div style="margin-bottom:20px;"><h3 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(heading)}</h3>${content}</div>`;
}

function proseParagraph(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 8px;">${escapeHtml(p.trim())}</p>`)
    .join("");
}

function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:3px 16px 3px 0;font-weight:600;color:#111827;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:3px 0;">${value}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Clipboard: rich text ──

export async function copyTextToClipboard(sheet: HotSheet): Promise<void> {
  const html = buildHotSheetHTML(sheet);
  const blob = new Blob([html], { type: "text/html" });
  await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
}

// ── SKU image export (PNG) ──

function buildSkuGridDOM(skus: HotSheetSKU[]): HTMLDivElement {
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:0;top:0;background:#fff;padding:32px;font-family:Inter,system-ui,sans-serif;";

  const cols = skus.length === 1 ? 1 : skus.length === 2 ? 2 : skus.length === 4 ? 2 : 3;
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:32px;`;

  for (const sku of skus) {
    const card = document.createElement("div");
    card.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px;height:280px;";

    const imgSrc = sku.processedImage || sku.imageUrl;
    if (imgSrc) {
      const imgWrap = document.createElement("div");
      imgWrap.style.cssText =
        "width:160px;height:160px;display:flex;align-items:center;justify-content:center;flex-shrink:0;";
      const img = document.createElement("img");
      img.src = imgSrc;
      img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;";
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.cssText =
        "width:160px;height:160px;background:#f3f4f6;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;";
      const label = document.createElement("span");
      label.style.cssText = "font-size:11px;color:#9ca3af;";
      label.textContent = "No image";
      placeholder.appendChild(label);
      card.appendChild(placeholder);
    }

    const textWrap = document.createElement("div");
    textWrap.style.cssText = "text-align:center;";

    const name = document.createElement("div");
    name.style.cssText = "font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;";
    name.textContent = sku.name;
    textWrap.appendChild(name);

    const pricing = document.createElement("div");
    pricing.style.cssText = "font-size:12px;color:#6b7280;margin-bottom:2px;";
    pricing.innerHTML = `<span>MSRP: ${formatPrice(sku.msrp)}</span> <span style="margin:0 4px">|</span> <span style="font-weight:600;color:#111827">Your Price: ${formatPrice(sku.offerPrice)}</span>`;
    textWrap.appendChild(pricing);

    const discount = percentOff(sku.msrp, sku.offerPrice);
    if (discount > 0) {
      const discountEl = document.createElement("div");
      discountEl.style.cssText = "font-size:12px;font-weight:700;color:#564ef5;";
      discountEl.textContent = `${discount}% Off MSRP`;
      textWrap.appendChild(discountEl);
    }

    if (sku.rating && hasText(sku.rating)) {
      const ratingEl = document.createElement("div");
      ratingEl.style.cssText = "font-size:11px;color:#6b7280;margin-top:2px;";
      ratingEl.textContent = sku.rating;
      textWrap.appendChild(ratingEl);
    }

    card.appendChild(textWrap);
    grid.appendChild(card);
  }

  container.appendChild(grid);
  return container;
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

export async function buildSkuGridPNG(skus: HotSheetSKU[]): Promise<string> {
  const el = buildSkuGridDOM(skus);
  document.body.appendChild(el);
  await waitForImages(el);
  try {
    return await toPng(el, { pixelRatio: 2, backgroundColor: "#ffffff" });
  } finally {
    document.body.removeChild(el);
  }
}

export async function copySkuImageToClipboard(skus: HotSheetSKU[]): Promise<void> {
  const dataUrl = await buildSkuGridPNG(skus);
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

// ── Section count helper ──

export function filledSectionCount(sheet: HotSheet): number {
  let count = 0;
  if (hasText(sheet.whyItsHot)) count++;
  if (hasText(sheet.distribution)) count++;
  if (hasListingInfo(sheet.listingInfo)) count++;
  if (sheet.pressFeatures.some((p) => hasText(p.text))) count++;
  if (sheet.viralTiktoks.some((t) => hasText(t.description))) count++;
  if (sheet.topSkus.some((s) => hasText(s.name))) count++;
  return count;
}

export const TOTAL_SECTIONS = 6;
