import { StoremetaError } from "../cli/errors.js";
import { listConfiguredApps, type ConfiguredApp } from "./apps.js";
import type { StoremetaConfig } from "./types.js";

export function hasSingleConfiguredApp(config: StoremetaConfig): boolean {
  return listConfiguredApps(config).length === 1;
}

export function getSingleConfiguredApp(
  config: StoremetaConfig,
): ConfiguredApp | undefined {
  const [app] = listConfiguredApps(config);

  return hasSingleConfiguredApp(config) ? app : undefined;
}

export function requireSingleConfiguredApp(
  config: StoremetaConfig,
): ConfiguredApp {
  const app = getSingleConfiguredApp(config);

  if (app === undefined) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      "Expected exactly one configured app",
    );
  }

  return app;
}
