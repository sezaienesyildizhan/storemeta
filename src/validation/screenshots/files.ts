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

export interface ScreenshotFileGroup {
  directory: string;
  files: string[];
}

export async function listScreenshotFileGroups(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<ScreenshotFileGroup[]> {
  const projectRoot = dirname(resolve(configPath));
  const groups: ScreenshotFileGroup[] = [];

  for (const platform of platforms) {
    const platformDir = resolve(projectRoot, app.settings.screenshots.baseDir, platform);
    const localeEntries = await listDirectoryEntries(platformDir);

    for (const localeEntry of localeEntries) {
      if (!localeEntry.isDirectory()) {
        continue;
      }

      const localeDir = join(platformDir, localeEntry.name);
      const assetTypeEntries = await listDirectoryEntries(localeDir);

      for (const assetTypeEntry of assetTypeEntries) {
        if (!assetTypeEntry.isDirectory()) {
          continue;
        }

        const assetTypeDir = join(localeDir, assetTypeEntry.name);
        const fileEntries = await listDirectoryEntries(assetTypeDir);
        const files = fileEntries
          .filter((fileEntry) => fileEntry.isFile())
          .map((fileEntry) => join(assetTypeDir, fileEntry.name))
          .sort((left, right) => left.localeCompare(right));

        groups.push({
          directory: assetTypeDir,
          files,
        });
      }
    }
  }

  return groups;
}

export async function listScreenshotFiles(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<string[]> {
  const files: string[] = [];

  for (const group of await listScreenshotFileGroups(configPath, app, platforms)) {
    files.push(...group.files);
  }

  return files.sort((left, right) => left.localeCompare(right));
}
