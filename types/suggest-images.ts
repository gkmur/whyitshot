export interface ImageSuggestion {
  dataUrl: string;
  title: string;
}

export interface SuggestImagesResponse {
  images: ImageSuggestion[];
}

export interface SuggestImagesError {
  error: string;
}
