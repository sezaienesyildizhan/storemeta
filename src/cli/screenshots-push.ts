import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandSummary } from "./result-types.js";
import { StoremetaError } from "./errors.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  loadGoogleScreenshotSets,
  mapGoogleScreenshotSetsToTargets,
  uploadGoogleScreenshotTargets,
} from "../platforms/google/screenshots/push.js";

function validateScreenshotsPushPlatform(
  platform: GlobalOptions["platform"],
): void {
  if (platform === undefined || platform === "google") {
    return;
  }

  throw new StoremetaError(
    "CONFIG_ERROR",
    'The current "screenshots push" command only supports --platform google',
  );
}

export async function runScreenshotsPushCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform" | "locale" | "dryRun">,
): Promise<CommandSummary> {
  validateScreenshotsPushPlatform(options.platform);

  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);
  const app = selectConfiguredApp(config, options.app);
  const googleSettings = app.settings.google;

  if (googleSettings === undefined) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Configured app "${app.id}" does not define Google Play settings`,
    );
  }

  const screenshotsBaseDir = resolve(
    dirname(loadedConfig.path),
    app.settings.screenshots.baseDir,
  );
  const selectedLocale =
    options.locale === undefined ? undefined : normalizeLocaleCode(options.locale);
  const uploadTargets = mapGoogleScreenshotSetsToTargets(
    await loadGoogleScreenshotSets(screenshotsBaseDir),
    googleSettings,
  ).filter(
    (target) => selectedLocale === undefined || target.targetLocale === selectedLocale,
  );
  const results = uploadTargets.map((target) => ({
    target: `${target.targetLocale}/${target.imageType}`,
    success: true,
    message: options.dryRun
      ? `Would upload ${target.files.length} screenshots`
      : `Queued ${target.files.length} screenshots for upload`,
  }));

  if (options.dryRun) {
    for (const target of uploadTargets) {
      console.log(
        `DRY RUN google screenshots ${target.targetLocale}/${target.imageType} (${target.files.length} files)`,
      );
    }

    return {
      status: "success",
      successCount: results.length,
      failureCount: 0,
      skippedCount: 0,
      results,
    };
  }

  const client = createGooglePlayClient(googleSettings.credentials);

  await withGoogleEditSession(client, googleSettings.packageName, async (edit) => {
    await uploadGoogleScreenshotTargets(
      client,
      googleSettings.packageName,
      edit.id,
      uploadTargets,
      {
        onTargetStarted: (target) => {
          console.log(
            `Uploading google screenshots ${target.targetLocale}/${target.imageType} (${target.files.length} files)`,
          );
        },
        onTargetCompleted: (target, targetResults) => {
          console.log(
            `Uploaded google screenshots ${target.targetLocale}/${target.imageType} (${targetResults.length} files)`,
          );
        },
      },
    );
  });

  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results: results.map((result) => ({
      ...result,
      message: result.message.replace("Queued", "Uploaded"),
    })),
  };
}
