export async function removeBg(imageDataUrl: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/remove-bg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_b64: imageDataUrl }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "BG removal failed" }));
    throw new Error((err as { error?: string }).error ?? "BG removal failed");
  }
  const data = await res.json();
  return (data as { result_b64: string }).result_b64;
}
