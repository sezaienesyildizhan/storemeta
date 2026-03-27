import { StoremetaError } from "../cli/errors.js";
import type { ConfiguredApp } from "./apps.js";

export type SelectedPlatform = "apple" | "google" | "all" | undefined;
export type ConfiguredPlatform = "apple" | "google";

export function resolveSelectedPlatforms(
  app: ConfiguredApp,
  selectedPlatform?: SelectedPlatform,
): ConfiguredPlatform[] {
  const configuredPlatforms: ConfiguredPlatform[] = [];

  if (app.settings.apple !== undefined) {
    configuredPlatforms.push("apple");
  }

  if (app.settings.google !== undefined) {
    configuredPlatforms.push("google");
  }

  if (selectedPlatform === undefined || selectedPlatform === "all") {
    return configuredPlatforms;
  }

  if (!configuredPlatforms.includes(selectedPlatform)) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Configured app "${app.id}" does not support platform "${selectedPlatform}"`,
    );
  }

  return [selectedPlatform];
}
