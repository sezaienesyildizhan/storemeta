import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import { StoremetaError } from "../cli/errors.js";
import type { MetadataFormat } from "../config/types.js";
import type { MetadataPlatform } from "./metadata-types.js";
import {
  loadMarkdownMetadataFile,
  loadYamlMetadataFile,
  loadYmlMetadataFile,
  type LoadedMetadataFile,
} from "./load-metadata.js";

export function metadataFileExtension(format: MetadataFormat): ".md" | ".yml" {
  return format === "markdown" ? ".md" : ".yml";
}

export function metadataFileName(locale: string, format: MetadataFormat): string {
  return `${locale}${metadataFileExtension(format)}`;
}

function formatMismatchMessage(filePath: string, format: MetadataFormat): string {
  const foundFormat = format === "markdown" ? "YAML" : "Markdown";

  return `${filePath}: ${foundFormat} metadata file found while metadata.format is ${format}`;
}

export async function listMetadataFilesForFormat(
  platformDir: string,
  format: MetadataFormat,
  options: { allowMissing?: boolean } = {},
): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(platformDir, { withFileTypes: true });
  } catch (cause) {
    if (
      options.allowMissing === true &&
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    ) {
      return [];
    }

    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read metadata directory at ${platformDir}`,
      { cause },
    );
  }

  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || entry.name.startsWith(".")) {
      continue;
    }

    const filePath = join(platformDir, entry.name);
    const extension = extname(entry.name).toLowerCase();
    const isMarkdown = extension === ".md";
    const isYaml = extension === ".yml" || extension === ".yaml";

    if ((format === "markdown" && isYaml) || (format === "yaml" && isMarkdown)) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        formatMismatchMessage(filePath, format),
      );
    }

    if ((format === "markdown" && isMarkdown) || (format === "yaml" && isYaml)) {
      files.push(filePath);
    }
  }

  return files;
}

export async function loadMetadataFileForFormat(
  filePath: string,
  platform: MetadataPlatform,
  format: MetadataFormat,
): Promise<LoadedMetadataFile> {
  const extension = extname(filePath).toLowerCase();

  if (format === "markdown") {
    if (extension !== ".md") {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        formatMismatchMessage(filePath, format),
      );
    }
    return loadMarkdownMetadataFile(filePath, platform);
  }

  if (extension === ".yml") {
    return loadYmlMetadataFile(filePath);
  }

  if (extension === ".yaml") {
    return loadYamlMetadataFile(filePath);
  }

  throw new StoremetaError(
    "VALIDATION_ERROR",
    formatMismatchMessage(filePath, format),
  );
}
