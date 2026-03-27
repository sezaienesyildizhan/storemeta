import { StoremetaError } from "../cli/errors.js";
import { listConfiguredApps } from "./apps.js";
import type { StoremetaConfig } from "./types.js";

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

export function validateRequiredPlatformIdentifiers(
  config: StoremetaConfig,
): void {
  const issues: string[] = [];

  for (const app of listConfiguredApps(config)) {
    const { apple, google } = app.settings;

    if (apple === undefined && google === undefined) {
      issues.push(`apps.${app.id}: at least one platform must be configured`);
      continue;
    }

    if (apple !== undefined && !hasText(apple.appId)) {
      issues.push(`apps.${app.id}.apple.appId: required`);
    }

    if (google !== undefined && !hasText(google.packageName)) {
      issues.push(`apps.${app.id}.google.packageName: required`);
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Platform identifier validation failed: ${issues.join("; ")}`,
    );
  }
}
