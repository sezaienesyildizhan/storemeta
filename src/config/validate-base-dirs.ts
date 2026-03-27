import { posix, win32 } from "node:path";

import { StoremetaError } from "../cli/errors.js";
import { listConfiguredApps } from "./apps.js";
import type { StoremetaConfig } from "./types.js";

function isAbsolutePath(value: string): boolean {
  return posix.isAbsolute(value) || win32.isAbsolute(value);
}

function normalizeRelativePath(value: string): string {
  return posix.normalize(value.replaceAll("\\", "/"));
}

function isSafeRelativeDirectoryPath(value: string): boolean {
  if (value.trim().length === 0 || isAbsolutePath(value)) {
    return false;
  }

  const normalized = normalizeRelativePath(value);

  if (normalized === "." || normalized === "..") {
    return false;
  }

  return !normalized.startsWith("../");
}

export function validateBaseDirectoryPaths(config: StoremetaConfig): void {
  const issues: string[] = [];

  for (const app of listConfiguredApps(config)) {
    if (!isSafeRelativeDirectoryPath(app.settings.metadata.baseDir)) {
      issues.push(`apps.${app.id}.metadata.baseDir: must be a safe relative path`);
    }

    if (!isSafeRelativeDirectoryPath(app.settings.screenshots.baseDir)) {
      issues.push(`apps.${app.id}.screenshots.baseDir: must be a safe relative path`);
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Base directory validation failed: ${issues.join("; ")}`,
    );
  }
}
