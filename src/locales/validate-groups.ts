import { StoremetaError } from "../cli/errors.js";
import type { GoogleScreenshotSettings } from "../config/types.js";
import { listScreenshotGroups } from "./groups.js";

export function validateScreenshotGroups(
  settings?: GoogleScreenshotSettings,
): void {
  const issues: string[] = [];

  for (const group of listScreenshotGroups(settings)) {
    const uniqueLocales = new Set(group.locales);

    if (uniqueLocales.size !== group.locales.length) {
      issues.push(
        `screenshots.groups.${group.name}: contains duplicate locales after normalization`,
      );
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Screenshot group validation failed: ${issues.join("; ")}`,
    );
  }
}
