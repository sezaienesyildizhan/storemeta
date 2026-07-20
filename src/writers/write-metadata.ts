import { writeFile } from "node:fs/promises";

import { StoremetaError } from "../cli/errors.js";
import type { MetadataFormat } from "../config/types.js";
import type {
  MetadataPlatform,
  PlatformMetadataDocument,
} from "../formats/metadata-types.js";
import type { SerializeMarkdownMetadataOptions } from "../formats/markdown-metadata.js";
import {
  serializeMarkdownMetadataDocument,
  serializeMetadataDocument,
} from "../formats/serialize-metadata.js";
import { ensureParentDirectory } from "./ensure-directory.js";
import { resolvePathWithinBaseDir } from "./resolve-within-base-dir.js";

export async function writeMetadataFile(
  baseDir: string,
  filePath: string,
  document: unknown,
  options: {
    format?: MetadataFormat;
    platform?: MetadataPlatform;
    markdown?: SerializeMarkdownMetadataOptions;
  } = {},
): Promise<string> {
  const resolvedPath = resolvePathWithinBaseDir(baseDir, filePath);
  const format = options.format ?? "yaml";
  let serialized: string;

  if (format === "markdown") {
    if (options.platform === undefined) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `Markdown metadata platform is required when writing ${resolvedPath}`,
      );
    }

    serialized = serializeMarkdownMetadataDocument(
      options.platform,
      document as PlatformMetadataDocument,
      options.markdown,
    );
  } else {
    serialized = serializeMetadataDocument(document);
  }

  try {
    await ensureParentDirectory(resolvedPath);
    await writeFile(resolvedPath, serialized, "utf8");
  } catch (cause) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to write metadata file at ${resolvedPath}`,
      { cause },
    );
  }

  return resolvedPath;
}
