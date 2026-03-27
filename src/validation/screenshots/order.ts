import { basename, extname } from "node:path";

import { StoremetaError } from "../../cli/errors.js";
import type { ConfiguredApp } from "../../config/apps.js";
import type { ConfiguredPlatform } from "../../config/select-platforms.js";
import { listScreenshotFileGroups } from "./files.js";

export async function validateScreenshotFileOrdering(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<void> {
  const groups = await listScreenshotFileGroups(configPath, app, platforms);
  const issues: string[] = [];

  for (const group of groups) {
    const orderedFileNames = group.files
      .map((filePath) => basename(filePath))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    for (const [index, fileName] of orderedFileNames.entries()) {
      const numericName = basename(fileName, extname(fileName));

      if (!/^\d+$/.test(numericName)) {
        issues.push(`${group.directory}/${fileName}: expected a numeric filename`);
        continue;
      }

      if (Number(numericName) !== index + 1) {
        issues.push(
          `${group.directory}/${fileName}: expected screenshot order ${index + 1}`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Screenshot ordering validation failed: ${issues.join("; ")}`,
    );
  }
}
