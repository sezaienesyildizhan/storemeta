import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { StoremetaError } from "../../cli/errors.js";
import type { ConfiguredApp } from "../../config/apps.js";
import type { ConfiguredPlatform } from "../../config/select-platforms.js";

async function listDirectoryEntries(directoryPath: string) {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read screenshot directory at ${directoryPath}`,
      { cause: error },
    );
  }
}

export async function validateScreenshotFolderStructure(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<void> {
  const projectRoot = dirname(resolve(configPath));
  const issues: string[] = [];

  for (const platform of platforms) {
    const platformDir = resolve(projectRoot, app.settings.screenshots.baseDir, platform);
    const localeEntries = await listDirectoryEntries(platformDir);

    for (const localeEntry of localeEntries) {
      if (!localeEntry.isDirectory()) {
        issues.push(`${join(platformDir, localeEntry.name)}: expected a locale directory`);
        continue;
      }

      const localeDir = join(platformDir, localeEntry.name);
      const assetTypeEntries = await listDirectoryEntries(localeDir);

      for (const assetTypeEntry of assetTypeEntries) {
        if (!assetTypeEntry.isDirectory()) {
          issues.push(
            `${join(localeDir, assetTypeEntry.name)}: expected an asset type directory`,
          );
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Screenshot folder validation failed: ${issues.join("; ")}`,
    );
  }
}
