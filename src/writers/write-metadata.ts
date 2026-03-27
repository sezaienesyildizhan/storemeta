import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { StoremetaError } from "../cli/errors.js";
import { serializeMetadataDocument } from "../formats/serialize-metadata.js";

export async function writeMetadataFile(
  filePath: string,
  document: unknown,
): Promise<string> {
  const resolvedPath = resolve(filePath);
  const serialized = serializeMetadataDocument(document);

  try {
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
