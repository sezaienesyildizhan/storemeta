import { extname } from "node:path";

import { StoremetaError } from "../../cli/errors.js";
import type { ConfiguredApp } from "../../config/apps.js";
import type { ConfiguredPlatform } from "../../config/select-platforms.js";
import { listScreenshotFiles } from "./files.js";

const SUPPORTED_SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

export async function validateScreenshotFileExtensions(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<void> {
  const files = await listScreenshotFiles(configPath, app, platforms);
  const issues: string[] = [];

  for (const filePath of files) {
    const extension = extname(filePath).toLowerCase();

    if (!SUPPORTED_SCREENSHOT_EXTENSIONS.has(extension)) {
      issues.push(`${filePath}: unsupported screenshot file extension`);
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Screenshot extension validation failed: ${issues.join("; ")}`,
    );
  }
}
