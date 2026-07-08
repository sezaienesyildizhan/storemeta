import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import { StoremetaError } from "./errors.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createAppStoreConnectClient } from "../platforms/apple/client.js";
import {
  fetchAppleAppInfoLocalizations,
  fetchAppleAppStoreVersionLocalizations,
  mergeAppleLocalizations,
  normalizeMergedAppleLocalizations,
  writeAppleMetadataDocuments,
} from "../platforms/apple/metadata/pull.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  fetchGoogleListingsForLocales,
  normalizeGoogleListing,
  writeGoogleListingDocuments,
} from "../platforms/google/metadata/pull.js";
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

export async function runMetadataPullCommand(
  options: Pick<GlobalOptions, "config" | "app" | "locale" | "platform">,
): Promise<void> {
  const context = await createCommandContext(options);
  const app = context.app;
  const selectedPlatforms = resolveSelectedPlatforms(app, context.platform);
  const metadataBaseDir = resolve(
    dirname(context.configPath),
    app.settings.metadata.baseDir,
  );

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
      const appInfoLocalizations = await fetchAppleAppInfoLocalizations(
        client,
        appleSettings.appId,
      );
      const appStoreVersionLocalizations =
        await fetchAppleAppStoreVersionLocalizations(client, appleSettings.appId);
      const documents = filterLocalizedDocumentsByLocale(
        normalizeMergedAppleLocalizations(
          mergeAppleLocalizations(
            appInfoLocalizations,
            appStoreVersionLocalizations,
          ),
        ),
        context.locale,
      );

      await writeAppleMetadataDocuments(metadataBaseDir, documents);
      continue;
    }

    const googleSettings = app.settings.google;

    if (googleSettings === undefined) {
      throw new StoremetaError(
        "CONFIG_ERROR",
        `Configured app "${app.id}" does not define Google Play settings`,
      );
    }

    const locales = context.locale
      ? [normalizeLocaleCode(context.locale)]
      : (googleSettings.locales?.default ?? []).map(normalizeLocaleCode);
    const client = createGooglePlayClient(googleSettings.credentials);

    await withGoogleEditSession(
      client,
      googleSettings.packageName,
      async (edit) => {
        const listings = await fetchGoogleListingsForLocales(
          client,
          googleSettings.packageName,
          edit.id,
          locales,
        );
        const documents = listings.map(normalizeGoogleListing);

        await writeGoogleListingDocuments(metadataBaseDir, documents);
      },
      {
        autoCommit: false,
      },
    );
  }
}
