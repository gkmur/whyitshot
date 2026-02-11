import { toPng } from "html-to-image";
import { type SKU, percentOff, formatPrice } from "@/types/sku";
import { dataUrlToBlob } from "./blob-url";

function buildExportHTML(skus: SKU[]): HTMLDivElement {
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
        "width:160px;height:160px;background:#f3f4f6;border-radius:8px;flex-shrink:0;";
      card.appendChild(placeholder);
    }

    const textWrap = document.createElement("div");
    textWrap.style.cssText = "text-align:center;";

    const name = document.createElement("div");
    name.style.cssText =
      "font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;";
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

async function captureElement(element: HTMLElement): Promise<string> {
  return toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
}

export async function generatePreview(skus: SKU[]): Promise<string> {
  const el = buildExportHTML(skus);
  document.body.appendChild(el);
  await waitForImages(el);
  try {
    return await captureElement(el);
  } finally {
    document.body.removeChild(el);
  }
}

export async function exportToPng(
  skus: SKU[],
  filename = "top-skus.png"
): Promise<void> {
  const dataUrl = await generatePreview(skus);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function copyToClipboard(skus: SKU[]): Promise<void> {
  const dataUrl = await generatePreview(skus);
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}
