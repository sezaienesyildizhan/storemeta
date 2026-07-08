import type { GlobalOptions } from "../cli.js";
import type { CommandSummary } from "./result-types.js";
import { requireAppleCredentials } from "../auth/apple/load-credentials.js";
import { requireGoogleCredentials } from "../auth/google/load-credentials.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { validateMetadataFiles } from "../validation/metadata/files.js";
import { validateScreenshotFileExtensions } from "../validation/screenshots/extensions.js";
import { validateScreenshotFolderStructure } from "../validation/screenshots/folders.js";
import { validateScreenshotFileOrdering } from "../validation/screenshots/order.js";
import { createCommandContext } from "./context.js";

export async function runValidateCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const results = [
    {
      target: "config.root",
      success: true,
      message: "Root config schema is valid",
    },
  ];
  const app = context.app;
  const platforms = resolveSelectedPlatforms(app, context.platform);

  results.push({
    target: `app.${app.id}`,
    success: true,
    message: `Selected platforms: ${platforms.join(", ") || "none"}`,
  });

  for (const platform of platforms) {
    if (platform === "apple" && app.settings.apple !== undefined) {
      requireAppleCredentials(app.settings.apple.credentials);
      results.push({
        target: `credentials.${platform}`,
        success: true,
        message: "Credentials are present",
      });
    }

    if (platform === "google" && app.settings.google !== undefined) {
      requireGoogleCredentials(app.settings.google.credentials);
      results.push({
        target: `credentials.${platform}`,
        success: true,
        message: "Credentials are present",
      });
    }
  }

  await validateMetadataFiles(context.configPath, app, platforms);
  results.push({
    target: "metadata",
    success: true,
    message: "Metadata files passed validation",
  });

  await validateScreenshotFolderStructure(context.configPath, app, platforms);
  results.push({
    target: "screenshots.structure",
    success: true,
    message: "Screenshot folder structure is valid",
  });

  await validateScreenshotFileExtensions(context.configPath, app, platforms);
  results.push({
    target: "screenshots.extensions",
    success: true,
    message: "Screenshot file extensions are supported",
  });

  await validateScreenshotFileOrdering(context.configPath, app, platforms);
  results.push({
    target: "screenshots.order",
    success: true,
    message: "Screenshot filenames are numbered correctly",
  });

  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}
