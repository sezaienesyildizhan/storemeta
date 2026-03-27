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
  createMissingAppleAppInfoLocalizations,
  createMissingAppleAppStoreVersionLocalizations,
  loadAppleMetadataDocuments,
  resolveAppleAppInfoResource,
  resolveEditableAppleAppStoreVersionResource,
  updateExistingAppleAppInfoLocalizations,
  updateExistingAppleAppStoreVersionLocalizations,
} from "../platforms/apple/metadata/push.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  loadGoogleMetadataDocuments,
  mapGoogleMetadataDocuments,
  uploadGoogleListings,
} from "../platforms/google/metadata/push.js";

function filterLocalizedDocumentsByLocale<T extends { locale: string }>(
  documents: T[],
  locale: string | undefined,
): T[] {
  if (locale === undefined) {
    return documents;
  }

  const normalizedLocale = normalizeLocaleCode(locale);

  return documents.filter(
    (document) => normalizeLocaleCode(document.locale) === normalizedLocale,
  );
}

function createSuccessSummary(results: CommandItemResult[]): CommandSummary {
  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}

export async function runMetadataPushCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform" | "locale" | "dryRun">,
): Promise<CommandSummary> {
  const loadedConfig = await loadConfigFile(options.config);
  const config = validateRootConfig(loadedConfig.parsed);
  const app = selectConfiguredApp(config, options.app);
  const selectedPlatforms = resolveSelectedPlatforms(app, options.platform);
  const metadataBaseDir = resolve(
    dirname(loadedConfig.path),
    app.settings.metadata.baseDir,
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

      const documents = filterLocalizedDocumentsByLocale(
        await loadAppleMetadataDocuments(metadataBaseDir),
        options.locale,
      );

      results.push(
        ...documents.map((document) => ({
          target: `apple/${document.locale}`,
          success: true,
          message: options.dryRun ? "Would sync Apple metadata" : "Synced Apple metadata",
        })),
      );

      if (options.dryRun) {
        continue;
      }

      const client = createAppStoreConnectClient(appleSettings.credentials);
      const appInfo = await resolveAppleAppInfoResource(client, appleSettings.appId);
      const editableVersion = await resolveEditableAppleAppStoreVersionResource(
        client,
        appleSettings.appId,
      );

      await updateExistingAppleAppInfoLocalizations(client, appInfo.id, documents);
      await createMissingAppleAppInfoLocalizations(client, appInfo.id, documents);
      await updateExistingAppleAppStoreVersionLocalizations(
        client,
        editableVersion.id,
        documents,
      );
      await createMissingAppleAppStoreVersionLocalizations(
        client,
        editableVersion.id,
        documents,
      );
      continue;
    }

    const googleSettings = app.settings.google;

    if (googleSettings === undefined) {
      throw new StoremetaError(
        "CONFIG_ERROR",
        `Configured app "${app.id}" does not define Google Play settings`,
      );
    }

    const documents = filterLocalizedDocumentsByLocale(
      await loadGoogleMetadataDocuments(metadataBaseDir),
      options.locale,
    );
    const updates = mapGoogleMetadataDocuments(documents);

    results.push(
      ...updates.map((update) => ({
        target: `google/${update.language}`,
        success: true,
        message: options.dryRun
          ? "Would upload listing metadata"
          : "Uploaded listing metadata",
      })),
    );

    if (options.dryRun) {
      for (const update of updates) {
        console.log(`DRY RUN google metadata ${update.language}`);
      }

      continue;
    }

    const client = createGooglePlayClient(googleSettings.credentials);

    await withGoogleEditSession(client, googleSettings.packageName, async (edit) => {
      await uploadGoogleListings(
        client,
        googleSettings.packageName,
        edit.id,
        updates,
      );
    });
  }

  return createSuccessSummary(results);
}
