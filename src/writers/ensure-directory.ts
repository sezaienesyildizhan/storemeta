import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { StoremetaError } from "../cli/errors.js";

export async function ensureDirectory(directoryPath: string): Promise<string> {
  const resolvedPath = resolve(directoryPath);

  try {
    await mkdir(resolvedPath, { recursive: true });
  } catch (cause) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to create directory at ${resolvedPath}`,
      { cause },
    );
  }

  return resolvedPath;
}

export async function ensureParentDirectory(filePath: string): Promise<string> {
  return ensureDirectory(dirname(resolve(filePath)));
}
