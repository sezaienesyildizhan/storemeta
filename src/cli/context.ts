import type { GlobalOptions } from "../cli.js";
import { type ConfiguredApp } from "../config/apps.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import type { StoremetaConfig } from "../config/types.js";
import { validateBaseDirectoryPaths } from "../config/validate-base-dirs.js";
import { validateCredentialEnvVarNames } from "../config/validate-credential-env-names.js";
import { validateRequiredPlatformIdentifiers } from "../config/validate-platform-identifiers.js";
import { normalizeLocaleCode } from "../locales/normalize.js";

export interface CommandContextOptions {
  config?: string;
  app?: string;
  platform?: GlobalOptions["platform"];
  locale?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface CommandContext {
  configPath: string;
  config: StoremetaConfig;
  app: ConfiguredApp;
  platform?: GlobalOptions["platform"];
  locale?: string;
  dryRun: boolean;
  verbose: boolean;
}

export async function createCommandContext(
  options: CommandContextOptions,
): Promise<CommandContext> {
  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);

  validateRequiredPlatformIdentifiers(config);
  validateCredentialEnvVarNames(config);
  validateBaseDirectoryPaths(config);

  return {
    configPath: loadedConfig.path,
    config,
    app: selectConfiguredApp(config, options.app),
    platform: options.platform,
    locale: options.locale === undefined ? undefined : normalizeLocaleCode(options.locale),
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? false,
  };
}
