import { join, resolve } from "node:path";

import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../locales/normalize.js";

export function resolveScreenshotSetDirectory(
  baseDir: string,
  screenshotSet: Pick<ScreenshotSetDescriptor, "platform" | "locale" | "assetType">,
): string {
  return resolve(
    join(
      baseDir,
      screenshotSet.platform,
      normalizeLocaleCode(screenshotSet.locale),
      screenshotSet.assetType,
    ),
  );
}

export function resolveScreenshotFilePath(
  baseDir: string,
  screenshot: Pick<
    ScreenshotDescriptor,
    "platform" | "locale" | "assetType" | "fileName"
  >,
): string {
  return resolve(
    join(
      resolveScreenshotSetDirectory(baseDir, screenshot),
      screenshot.fileName,
    ),
  );
}
