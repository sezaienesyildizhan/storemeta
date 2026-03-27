import type { GlobalOptions } from "../cli.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";

export async function runValidateCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<void> {
  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);
  const app = selectConfiguredApp(config, options.app);

  resolveSelectedPlatforms(app, options.platform);
}
