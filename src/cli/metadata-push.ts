import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandSummary, CommandItemResult } from "./result-types.js";
import { StoremetaError } from "./errors.js";
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
import { createCommandContext } from "./context.js";

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
  const context = await createCommandContext(options);
  const app = context.app;
  const selectedPlatforms = resolveSelectedPlatforms(app, context.platform);
  const metadataBaseDir = resolve(
    dirname(context.configPath),
    app.settings.metadata.baseDir,
  );
  const results: CommandItemResult[] = [];
  const metadataFormat = app.settings.metadata.format;
  const appleDocuments = selectedPlatforms.includes("apple")
    ? filterLocalizedDocumentsByLocale(
        await loadAppleMetadataDocuments(metadataBaseDir, metadataFormat),
        context.locale,
      )
    : [];
  const googleDocuments = selectedPlatforms.includes("google")
    ? filterLocalizedDocumentsByLocale(
        await loadGoogleMetadataDocuments(metadataBaseDir, metadataFormat),
        context.locale,
      )
    : [];

  for (const platform of selectedPlatforms) {
    if (platform === "apple") {
      const appleSettings = app.settings.apple;

      if (appleSettings === undefined) {
        throw new StoremetaError(
          "CONFIG_ERROR",
          `Configured app "${app.id}" does not define App Store Connect settings`,
        );
      }

      const documents = appleDocuments;

      results.push(
        ...documents.map((document) => ({
          target: `apple/${document.locale}`,
          success: true,
          message: context.dryRun ? "Would sync Apple metadata" : "Synced Apple metadata",
        })),
      );

      if (context.dryRun) {
        for (const document of documents) {
          console.log(`DRY RUN apple metadata ${document.locale}`);
        }

        continue;
      }

      for (const document of documents) {
        console.log(`Syncing apple metadata ${document.locale}`);
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

      for (const document of documents) {
        console.log(`Synced apple metadata ${document.locale}`);
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

    const documents = googleDocuments;
    const updates = mapGoogleMetadataDocuments(documents);

    results.push(
      ...updates.map((update) => ({
        target: `google/${update.language}`,
        success: true,
        message: context.dryRun
          ? "Would upload listing metadata"
          : "Uploaded listing metadata",
      })),
    );

    if (context.dryRun) {
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
        {
          onUploaded: (update) => {
            console.log(`Uploaded google metadata ${update.language}`);
          },
        },
      );
    });
  }

  return createSuccessSummary(results);
}
