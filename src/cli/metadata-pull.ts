import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import { StoremetaError } from "./errors.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  fetchGoogleListingsForLocales,
  normalizeGoogleListing,
  writeGoogleListingDocuments,
} from "../platforms/google/metadata/pull.js";
import { normalizeLocaleCode } from "../locales/normalize.js";

function resolveGooglePullLocales(
  options: Pick<GlobalOptions, "locale">,
  defaults: string[] | undefined,
): string[] {
  if (options.locale !== undefined) {
    return [normalizeLocaleCode(options.locale)];
  }

  return (defaults ?? []).map(normalizeLocaleCode);
}

function validateMetadataPullPlatform(
  platform: GlobalOptions["platform"],
): void {
  if (platform === undefined || platform === "google") {
    return;
  }

  throw new StoremetaError(
    "CONFIG_ERROR",
    'The current "metadata pull" command only supports --platform google',
  );
}

export async function runMetadataPullCommand(
  options: Pick<GlobalOptions, "config" | "app" | "locale" | "platform">,
): Promise<void> {
  validateMetadataPullPlatform(options.platform);

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

  const locales = resolveGooglePullLocales(options, googleSettings.locales?.default);
  const metadataBaseDir = resolve(
    dirname(loadedConfig.path),
    app.settings.metadata.baseDir,
  );
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
