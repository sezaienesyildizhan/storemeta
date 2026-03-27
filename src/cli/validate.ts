import type { GlobalOptions } from "../cli.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";

export async function runValidateCommand(
  options: Pick<GlobalOptions, "config">,
): Promise<void> {
  const loadedConfig = await loadConfigFile(options.config);

  validateRootConfig(loadedConfig.parsed);
}
