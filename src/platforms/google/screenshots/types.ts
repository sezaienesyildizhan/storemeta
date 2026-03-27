export type GoogleScreenshotImageType =
  | "phoneScreenshots"
  | "sevenInchScreenshots"
  | "tenInchScreenshots"
  | "tvScreenshots"
  | "wearScreenshots";

export const GOOGLE_SCREENSHOT_IMAGE_TYPES: GoogleScreenshotImageType[] = [
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
];

export interface GooglePlayImage {
  id?: string;
  url?: string;
  sha1?: string;
  sha256?: string;
}

export interface GooglePlayImageListResponse {
  images?: GooglePlayImage[];
}

export interface GoogleScreenshotSet {
  locale: string;
  imageType: GoogleScreenshotImageType;
  images: GooglePlayImage[];
}
