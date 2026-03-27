import type { AppSettings, StoremetaConfig } from "./types.js";

export interface ConfiguredApp {
  id: string;
  settings: AppSettings;
}

export function listConfiguredApps(config: StoremetaConfig): ConfiguredApp[] {
  return Object.entries(config.apps)
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([id, settings]) => ({
      id,
      settings,
    }));
}

export function getConfiguredApp(
  config: StoremetaConfig,
  appId: string,
): ConfiguredApp | undefined {
  const settings = config.apps[appId];

  if (settings === undefined) {
    return undefined;
  }

  return {
    id: appId,
    settings,
  };
}

export function hasConfiguredApp(config: StoremetaConfig, appId: string): boolean {
  return getConfiguredApp(config, appId) !== undefined;
}
