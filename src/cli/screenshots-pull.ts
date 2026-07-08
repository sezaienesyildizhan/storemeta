import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import { StoremetaError } from "./errors.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createAppStoreConnectClient } from "../platforms/apple/client.js";
import {
  downloadAppleScreenshotSet,
  fetchAppleScreenshotLocalizations,
  fetchAppleScreenshotsForSets,
  fetchAppleScreenshotSetsForLocalizations,
  filterAppleScreenshotLocalizationsByLocale,
} from "../platforms/apple/screenshots/pull.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  downloadGoogleScreenshotSet,
  expandGoogleScreenshotPullLocales,
  listGoogleImagesForLocalesAndTypes,
} from "../platforms/google/screenshots/pull.js";
import { GOOGLE_SCREENSHOT_IMAGE_TYPES } from "../platforms/google/screenshots/types.js";
import { createCommandContext } from "./context.js";

function createSuccessSummary(results: CommandItemResult[]): CommandSummary {
  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}

export async function runScreenshotsPullCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform" | "locale">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const app = context.app;
  const selectedPlatforms = resolveSelectedPlatforms(app, context.platform);
  const screenshotsBaseDir = resolve(
    dirname(context.configPath),
    app.settings.screenshots.baseDir,
  );
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

      const client = createAppStoreConnectClient(appleSettings.credentials);
      const localizations = filterAppleScreenshotLocalizationsByLocale(
        await fetchAppleScreenshotLocalizations(client, appleSettings.appId),
        context.locale,
      );
      const screenshotSetsByLocalization =
        await fetchAppleScreenshotSetsForLocalizations(client, localizations);
      const screenshotSets = await fetchAppleScreenshotsForSets(
        client,
        screenshotSetsByLocalization,
      );

      for (const screenshotSet of screenshotSets) {
        const downloadedSet = await downloadAppleScreenshotSet(
          screenshotsBaseDir,
          screenshotSet,
        );

        console.log(
          `Pulled apple screenshots ${downloadedSet.locale}/${downloadedSet.assetType} (${downloadedSet.files.length} files)`,
        );

        results.push({
          target: `apple/${downloadedSet.locale}/${downloadedSet.assetType}`,
          success: true,
          message: `Pulled ${downloadedSet.files.length} screenshots`,
        });
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

    const locales = expandGoogleScreenshotPullLocales(
      context.locale === undefined
        ? (googleSettings.locales?.default ?? []).map(normalizeLocaleCode)
        : [context.locale],
      googleSettings.screenshots,
    );
    const client = createGooglePlayClient(googleSettings.credentials);

    await withGoogleEditSession(
      client,
      googleSettings.packageName,
      async (edit) => {
        const screenshotSets = await listGoogleImagesForLocalesAndTypes(
          client,
          googleSettings.packageName,
          edit.id,
          locales,
          GOOGLE_SCREENSHOT_IMAGE_TYPES,
        );

        for (const screenshotSet of screenshotSets) {
          const downloadedSet = await downloadGoogleScreenshotSet(
            screenshotsBaseDir,
            screenshotSet,
          );

          console.log(
            `Pulled google screenshots ${downloadedSet.locale}/${downloadedSet.assetType} (${downloadedSet.files.length} files)`,
          );

          results.push({
            target: `google/${downloadedSet.locale}/${downloadedSet.assetType}`,
            success: true,
            message: `Pulled ${downloadedSet.files.length} screenshots`,
          });
        }
      },
      {
        autoCommit: false,
      },
    );
  }

  return createSuccessSummary(results);
}
