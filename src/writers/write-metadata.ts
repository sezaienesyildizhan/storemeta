import { writeFile } from "node:fs/promises";

import { StoremetaError } from "../cli/errors.js";
import { serializeMetadataDocument } from "../formats/serialize-metadata.js";
import { ensureParentDirectory } from "./ensure-directory.js";
import { resolvePathWithinBaseDir } from "./resolve-within-base-dir.js";

export async function writeMetadataFile(
  baseDir: string,
  filePath: string,
  document: unknown,
): Promise<string> {
  const resolvedPath = resolvePathWithinBaseDir(baseDir, filePath);
  const serialized = serializeMetadataDocument(document);

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
