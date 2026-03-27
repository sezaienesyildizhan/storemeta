import { StoremetaError } from "../cli/errors.js";
import type { AppSettings, StoremetaConfig } from "./types.js";

export interface SingleConfiguredApp {
  id: string;
  settings: AppSettings;
}

export function hasSingleConfiguredApp(config: StoremetaConfig): boolean {
  return Object.keys(config.apps).length === 1;
}

export function getSingleConfiguredApp(
  config: StoremetaConfig,
): SingleConfiguredApp | undefined {
  const [entry] = Object.entries(config.apps);

  if (entry === undefined || !hasSingleConfiguredApp(config)) {
    return undefined;
  }

  const [id, settings] = entry;

  return {
    id,
    settings,
  };
}

export function requireSingleConfiguredApp(
  config: StoremetaConfig,
): SingleConfiguredApp {
  const app = getSingleConfiguredApp(config);

  if (app === undefined) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      "Expected exactly one configured app",
    );
  }

  return app;
}
