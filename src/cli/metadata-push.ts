import { dirname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import { StoremetaError } from "./errors.js";
import { loadConfigFile } from "../config/load-config.js";
import { validateRootConfig } from "../config/schema.js";
import { selectConfiguredApp } from "../config/select-app.js";
import { createGooglePlayClient } from "../platforms/google/client.js";
import { withGoogleEditSession } from "../platforms/google/edits.js";
import {
  loadGoogleMetadataDocuments,
  mapGoogleMetadataDocuments,
  uploadGoogleListings,
} from "../platforms/google/metadata/push.js";
import { normalizeLocaleCode } from "../locales/normalize.js";

function validateMetadataPushPlatform(
  platform: GlobalOptions["platform"],
): void {
  if (platform === undefined || platform === "google") {
    return;
  }

  throw new StoremetaError(
    "CONFIG_ERROR",
    'The current "metadata push" command only supports --platform google',
  );
}

export async function runMetadataPushCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform" | "locale" | "dryRun">,
): Promise<void> {
  validateMetadataPushPlatform(options.platform);

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

  const metadataBaseDir = resolve(
    dirname(loadedConfig.path),
    app.settings.metadata.baseDir,
  );
  const selectedLocale =
    options.locale === undefined ? undefined : normalizeLocaleCode(options.locale);
  const documents = (await loadGoogleMetadataDocuments(metadataBaseDir)).filter(
    (document) =>
      selectedLocale === undefined ||
      normalizeLocaleCode(document.locale) === selectedLocale,
  );
  const updates = mapGoogleMetadataDocuments(documents);

  if (options.dryRun) {
    return;
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
