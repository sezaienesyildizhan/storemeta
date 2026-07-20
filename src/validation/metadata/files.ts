import { dirname, resolve } from "node:path";

import type { ConfiguredApp } from "../../config/apps.js";
import type { ConfiguredPlatform } from "../../config/select-platforms.js";
import {
  listMetadataFilesForFormat,
  loadMetadataFileForFormat,
} from "../../formats/metadata-files.js";
import { validateAppleMetadataDocument } from "./apple.js";
import {
  validateGoogleMetadataDocument,
  validateGoogleMetadataLengthConstraints,
} from "./google.js";

export async function validateMetadataFiles(
  configPath: string,
  app: ConfiguredApp,
  platforms: ConfiguredPlatform[],
): Promise<void> {
  const projectRoot = dirname(resolve(configPath));

  for (const platform of platforms) {
    const platformDir = resolve(projectRoot, app.settings.metadata.baseDir, platform);
    const files = await listMetadataFilesForFormat(
      platformDir,
      app.settings.metadata.format,
      { allowMissing: true },
    );

    for (const filePath of files) {
      const parsedDocument = (
        await loadMetadataFileForFormat(
          filePath,
          platform,
          app.settings.metadata.format,
        )
      ).parsed;

      if (platform === "apple") {
        validateAppleMetadataDocument(parsedDocument);
      }

      if (platform === "google") {
        const googleDocument = validateGoogleMetadataDocument(parsedDocument);
        validateGoogleMetadataLengthConstraints(googleDocument);
      }
    }
  }
}
