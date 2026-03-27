import { StoremetaError } from "../cli/errors.js";
import { getConfiguredApp, type ConfiguredApp } from "./apps.js";
import type { StoremetaConfig } from "./types.js";

export function selectConfiguredApp(
  config: StoremetaConfig,
  selectedAppId?: string,
): ConfiguredApp {
  const targetAppId = selectedAppId ?? config.project.defaultApp;
  const app = getConfiguredApp(config, targetAppId);

  if (app === undefined) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Configured app "${targetAppId}" was not found`,
    );
  }

  return app;
}
