export interface ImageSuggestion {
  dataUrl: string;
  originalUrl: string;
  title: string;
}

export function isImageSuggestion(v: unknown): v is ImageSuggestion {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dataUrl === "string" &&
    typeof o.originalUrl === "string" &&
    typeof o.title === "string"
  );
}
