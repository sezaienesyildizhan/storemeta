import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandSummary, CommandItemResult } from "./result-types.js";
import { StoremetaError } from "./errors.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createAppStoreConnectClient } from "../platforms/apple/client.js";
import {
  clearAppleScreenshotUploadTargets,
  commitAppleScreenshotUploads,
  loadAppleScreenshotSets,
  reserveAppleScreenshotUploads,
  resolveOrCreateAppleScreenshotLocalizations,
  resolveOrCreateAppleScreenshotUploadTargets,
  uploadReservedAppleScreenshots,
} from "../platforms/apple/screenshots/push.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  clearGoogleScreenshotTargets,
  loadGoogleScreenshotSets,
  mapGoogleScreenshotSetsToTargets,
  uploadGoogleScreenshotTargets,
} from "../platforms/google/screenshots/push.js";

function createSuccessSummary(results: CommandItemResult[]): CommandSummary {
  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}

export async function runScreenshotsPushCommand(
  options: Pick<
    GlobalOptions,
    "config" | "app" | "platform" | "locale" | "dryRun" | "replace"
  >,
): Promise<CommandSummary> {
  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);
  const app = selectConfiguredApp(config, options.app);
  const selectedPlatforms = resolveSelectedPlatforms(app, options.platform);
  const screenshotsBaseDir = resolve(
    dirname(loadedConfig.path),
    app.settings.screenshots.baseDir,
  );
  const selectedLocale =
    options.locale === undefined ? undefined : normalizeLocaleCode(options.locale);
  const results: CommandItemResult[] = [];

  for (const platform of selectedPlatforms) {
    if (platform === "apple") {
      const appleSettings = app.settings.apple;

      if (appleSettings === undefined) {
        throw new StoremetaError(
          "CONFIG_ERROR",
          `Configured app "${app.id}" does not define App Store Connect settings`,
        );
      }

      const screenshotSets = (await loadAppleScreenshotSets(screenshotsBaseDir)).filter(
        (set) => selectedLocale === undefined || set.locale === selectedLocale,
      );

      results.push(
        ...screenshotSets.map((set) => ({
          target: `apple/${set.locale}/${set.assetType}`,
          success: true,
          message: options.dryRun
            ? `Would upload ${set.files.length} screenshots`
            : `Uploaded ${set.files.length} screenshots`,
        })),
      );

      if (options.dryRun) {
        for (const screenshotSet of screenshotSets) {
          console.log(
            `DRY RUN apple screenshots ${screenshotSet.locale}/${screenshotSet.assetType} (${screenshotSet.files.length} files)`,
          );
        }

        continue;
      }

      const client = createAppStoreConnectClient(appleSettings.credentials);
      const localizations = await resolveOrCreateAppleScreenshotLocalizations(
        client,
        appleSettings.appId,
        screenshotSets,
      );
      const uploadTargets = await resolveOrCreateAppleScreenshotUploadTargets(
        client,
        localizations,
        screenshotSets,
      );

      for (const uploadTarget of uploadTargets) {
        if (options.replace) {
          console.log(
            `Replacing apple screenshots ${uploadTarget.locale}/${uploadTarget.assetType} by deleting existing remote screenshots`,
          );

          await clearAppleScreenshotUploadTargets(client, [uploadTarget], {
            clearExisting: true,
          });
        }

        console.log(
          `Uploading apple screenshots ${uploadTarget.locale}/${uploadTarget.assetType} (${uploadTarget.files.length} files)`,
        );

        const reservations = await reserveAppleScreenshotUploads(client, [uploadTarget]);

        await uploadReservedAppleScreenshots(reservations);
        await commitAppleScreenshotUploads(client, reservations);

        console.log(
          `Uploaded apple screenshots ${uploadTarget.locale}/${uploadTarget.assetType} (${uploadTarget.files.length} files)`,
        );
      }
      continue;
    }

    const googleSettings = app.settings.google;

    if (googleSettings === undefined) {
      throw new StoremetaError(
        "CONFIG_ERROR",
        `Configured app "${app.id}" does not define Google Play settings`,
      );
    }

    const uploadTargets = mapGoogleScreenshotSetsToTargets(
      await loadGoogleScreenshotSets(screenshotsBaseDir),
      googleSettings,
    ).filter(
      (target) => selectedLocale === undefined || target.targetLocale === selectedLocale,
    );

    results.push(
      ...uploadTargets.map((target) => ({
        target: `google/${target.targetLocale}/${target.imageType}`,
        success: true,
        message: options.dryRun
          ? `Would upload ${target.files.length} screenshots`
          : `Uploaded ${target.files.length} screenshots`,
      })),
    );

    if (options.dryRun) {
      for (const target of uploadTargets) {
        console.log(
          `DRY RUN google screenshots ${target.targetLocale}/${target.imageType} (${target.files.length} files)`,
        );
      }

      continue;
    }

    const client = createGooglePlayClient(googleSettings.credentials);

    await withGoogleEditSession(client, googleSettings.packageName, async (edit) => {
      if (options.replace) {
        const clearResults = await clearGoogleScreenshotTargets(
          client,
          googleSettings.packageName,
          edit.id,
          uploadTargets,
          {
            clearExisting: true,
          },
        );

        for (const clearResult of clearResults) {
          console.log(
            `Replacing google screenshots ${clearResult.targetLocale}/${clearResult.imageType} by deleting ${clearResult.deleted.length} existing screenshots`,
          );
        }
      }

      await uploadGoogleScreenshotTargets(
        client,
        googleSettings.packageName,
        edit.id,
        uploadTargets,
      );
    });
  }

  return createSuccessSummary(results);
}
