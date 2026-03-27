import type { GlobalOptions } from "../cli.js";
import { requireAppleCredentials } from "../auth/apple/load-credentials.js";
import { requireGoogleCredentials } from "../auth/google/load-credentials.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { validateMetadataFiles } from "../validation/metadata/files.js";
import { validateScreenshotFileExtensions } from "../validation/screenshots/extensions.js";
import { validateScreenshotFolderStructure } from "../validation/screenshots/folders.js";

export async function runValidateCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<void> {
  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);
  const app = selectConfiguredApp(config, options.app);
  const platforms = resolveSelectedPlatforms(app, options.platform);

  for (const platform of platforms) {
    if (platform === "apple" && app.settings.apple !== undefined) {
      requireAppleCredentials(app.settings.apple.credentials);
    }

    if (platform === "google" && app.settings.google !== undefined) {
      requireGoogleCredentials(app.settings.google.credentials);
    }
  }

  await validateMetadataFiles(loadedConfig.path, app, platforms);
  await validateScreenshotFolderStructure(loadedConfig.path, app, platforms);
  await validateScreenshotFileExtensions(loadedConfig.path, app, platforms);
}
