import { readdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

import { StoremetaError } from "../../cli/errors.js";
import type { ConfiguredApp } from "../../config/apps.js";
import type { ConfiguredPlatform } from "../../config/select-platforms.js";
import {
  loadMarkdownMetadataFile,
  loadYamlMetadataFile,
  loadYmlMetadataFile,
} from "../../formats/load-metadata.js";
import { validateAppleMetadataDocument } from "./apple.js";
import { validateGoogleMetadataDocument } from "./google.js";

async function listMetadataFiles(platformDir: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(platformDir, { withFileTypes: true });
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
      `Failed to read metadata directory at ${platformDir}`,
      { cause: error },
    );
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(platformDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function loadMetadataDocument(filePath: string): Promise<unknown | undefined> {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".yml") {
    return (await loadYmlMetadataFile(filePath)).parsed;
  }

  if (extension === ".yaml") {
    return (await loadYamlMetadataFile(filePath)).parsed;
  }

  if (extension === ".md") {
    return (await loadMarkdownMetadataFile(filePath)).parsed;
  }

  return undefined;
}

export async function validateMetadataFiles(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<void> {
  const projectRoot = dirname(resolve(configPath));

  for (const platform of platforms) {
    const platformDir = resolve(projectRoot, app.settings.metadata.baseDir, platform);
    const files = await listMetadataFiles(platformDir);

    for (const filePath of files) {
      const parsedDocument = await loadMetadataDocument(filePath);

      if (parsedDocument === undefined) {
        continue;
      }

      if (platform === "apple") {
        validateAppleMetadataDocument(parsedDocument);
      }

      if (platform === "google") {
        validateGoogleMetadataDocument(parsedDocument);
      }
    }
  }
}
