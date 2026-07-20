import { readFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import YAML from "yaml";

import { StoremetaError } from "../cli/errors.js";
import type { MetadataPlatform } from "./metadata-types.js";
import { parseMarkdownMetadataDocument } from "./markdown-metadata.js";

export interface LoadedMetadataFile {
  path: string;
  raw: string;
  parsed: unknown;
}

async function loadMetadataFileForExtension(
  filePath: string,
  expectedExtension: ".yml" | ".yaml" | ".md",
): Promise<LoadedMetadataFile> {
  const resolvedPath = resolve(filePath);

  if (extname(resolvedPath).toLowerCase() !== expectedExtension) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Expected a ${expectedExtension} metadata file: ${resolvedPath}`,
    );
  }

  let raw: string;

  try {
    raw = await readFile(resolvedPath, "utf8");
  } catch (cause) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read metadata file at ${resolvedPath}`,
      { cause },
    );
  }

  let parsed: unknown;

  if (expectedExtension === ".md") {
    parsed = raw;
  } else {
    try {
      parsed = YAML.parse(raw);
    } catch (cause) {
      throw new StoremetaError(
        "CONFIG_ERROR",
        `Failed to parse YAML metadata at ${resolvedPath}`,
        { cause },
      );
    }
  }

  return {
    path: resolvedPath,
    raw,
    parsed,
  };
}

export async function loadYmlMetadataFile(
  filePath: string,
): Promise<LoadedMetadataFile> {
  return loadMetadataFileForExtension(filePath, ".yml");
}

export async function loadYamlMetadataFile(
  filePath: string,
): Promise<LoadedMetadataFile> {
  return loadMetadataFileForExtension(filePath, ".yaml");
}

export async function loadMarkdownMetadataFile(
  filePath: string,
  platform?: MetadataPlatform,
): Promise<LoadedMetadataFile> {
  const loaded = await loadMetadataFileForExtension(filePath, ".md");
  const inferredPlatform = basename(dirname(loaded.path));
  const resolvedPlatform =
    platform ??
    (inferredPlatform === "apple" || inferredPlatform === "google"
      ? inferredPlatform
      : undefined);

  if (resolvedPlatform === undefined) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Cannot determine metadata platform for Markdown file at ${loaded.path}`,
    );
  }

  return {
    ...loaded,
    parsed: parseMarkdownMetadataDocument(loaded.raw, resolvedPlatform, loaded.path),
  };
}
