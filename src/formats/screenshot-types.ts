export type ScreenshotPlatform = "apple" | "google";

export interface ScreenshotDescriptor {
  platform: ScreenshotPlatform;
  locale: string;
  assetType: string;
  filePath: string;
  fileName: string;
  position: number;
}

export interface ScreenshotSetDescriptor {
  platform: ScreenshotPlatform;
  locale: string;
  assetType: string;
  files: ScreenshotDescriptor[];
}
