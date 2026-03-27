import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { resolvePathWithinBaseDir } from "./resolve-within-base-dir.js";

export function resolveScreenshotSetDirectory(
  baseDir: string,
  screenshotSet: Pick<ScreenshotSetDescriptor, "platform" | "locale" | "assetType">,
): string {
  return resolvePathWithinBaseDir(
    baseDir,
    screenshotSet.platform,
    normalizeLocaleCode(screenshotSet.locale),
    screenshotSet.assetType,
  );
}

export function resolveScreenshotFilePath(
  baseDir: string,
  screenshot: Pick<
    ScreenshotDescriptor,
    "platform" | "locale" | "assetType" | "fileName"
  >,
): string {
  return resolvePathWithinBaseDir(
    baseDir,
    screenshot.platform,
    normalizeLocaleCode(screenshot.locale),
    screenshot.assetType,
    screenshot.fileName,
  );
}
