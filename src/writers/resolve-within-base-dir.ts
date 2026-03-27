import { isAbsolute, relative, resolve } from "node:path";

import { StoremetaError } from "../cli/errors.js";

export function assertPathWithinBaseDir(
  baseDir: string,
  targetPath: string,
): string {
  const resolvedBaseDir = resolve(baseDir);
  const resolvedTargetPath = resolve(targetPath);
  const relativePath = relative(resolvedBaseDir, resolvedTargetPath);

  if (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  ) {
    return resolvedTargetPath;
  }

  throw new StoremetaError(
    "FILESYSTEM_ERROR",
    `Resolved path escapes base directory: ${resolvedTargetPath}`,
  );
}

export function resolvePathWithinBaseDir(
  baseDir: string,
  ...pathSegments: string[]
): string {
  const resolvedBaseDir = resolve(baseDir);
  const resolvedTargetPath = resolve(resolvedBaseDir, ...pathSegments);

  return assertPathWithinBaseDir(resolvedBaseDir, resolvedTargetPath);
}
