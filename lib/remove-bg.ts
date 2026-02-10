import { removeBackground } from "@imgly/background-removal";

export async function removeBg(imageDataUrl: string): Promise<string> {
  const blob = await removeBackground(imageDataUrl, {
    output: { format: "image/png", quality: 0.9 },
  });

  return URL.createObjectURL(blob);
}
