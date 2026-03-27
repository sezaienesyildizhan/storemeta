import { writeFile } from "node:fs/promises";

import { StoremetaError } from "../../../cli/errors.js";
import type { GoogleScreenshotSettings } from "../../../config/types.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { listScreenshotGroups } from "../../../locales/groups.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import { ensureParentDirectory } from "../../../writers/ensure-directory.js";
import { resolveScreenshotFilePath } from "../../../writers/resolve-screenshot-path.js";
import { GooglePlayClient } from "../client.js";
import type {
  GooglePlayImage,
  GooglePlayImageListResponse,
  GoogleScreenshotImageType,
  GoogleScreenshotSet,
} from "./types.js";

export async function listGoogleImagesForLocaleAndType(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locale: string,
  imageType: GoogleScreenshotImageType,
): Promise<GoogleScreenshotSet> {
  const response = await client.requestJson<GooglePlayImageListResponse>(
    `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale)}/${encodeURIComponent(imageType)}`,
  );

  return {
    locale: normalizeLocaleCode(locale),
    imageType,
    images: response.images ?? [],
  };
}

export async function listGoogleImagesForLocalesAndTypes(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locales: string[],
  imageTypes: GoogleScreenshotImageType[],
): Promise<GoogleScreenshotSet[]> {
  return Promise.all(
    locales.flatMap((locale) =>
      imageTypes.map((imageType) =>
        listGoogleImagesForLocaleAndType(
          client,
          packageName,
          editId,
          locale,
          imageType,
        ),
      ),
    ),
  );
}

export function expandGoogleScreenshotPullLocales(
  locales: string[],
  settings?: GoogleScreenshotSettings,
): string[] {
  const resolvedLocales: string[] = [];
  const seenLocales = new Set<string>();

  for (const locale of locales.map(normalizeLocaleCode)) {
    if (seenLocales.has(locale)) {
      continue;
    }

    resolvedLocales.push(locale);
    seenLocales.add(locale);
  }

  for (const group of listScreenshotGroups(settings)) {
    const groupMatches = group.locales.some((locale) => seenLocales.has(locale));

    if (!groupMatches) {
      continue;
    }

    for (const locale of group.locales) {
      if (seenLocales.has(locale)) {
        continue;
      }

      resolvedLocales.push(locale);
      seenLocales.add(locale);
    }
  }

  return resolvedLocales;
}

function normalizeGoogleImageExtension(extension: string): string {
  return extension.replace(/^\./u, "").toLowerCase();
}

function inferGoogleImageExtension(
  imageUrl: string,
  contentType: string | null,
): string {
  if (contentType !== null) {
    if (contentType.includes("png")) {
      return "png";
    }

    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return "jpg";
    }

    if (contentType.includes("webp")) {
      return "webp";
    }
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const match = parsedUrl.pathname.match(/\.([A-Za-z0-9]+)$/u);

    if (match?.[1] !== undefined) {
      return normalizeGoogleImageExtension(match[1]);
    }
  } catch {
    // Fall back to png when the remote URL is not parseable.
  }

  return "png";
}

function createGoogleDownloadedFileName(
  position: number,
  extension: string,
): string {
  return `${position}.${normalizeGoogleImageExtension(extension)}`;
}

export async function downloadGoogleImage(
  image: GooglePlayImage,
): Promise<{ buffer: Uint8Array; extension: string }> {
  if (image.url === undefined || image.url.trim().length === 0) {
    throw new StoremetaError(
      "API_ERROR",
      "Google Play returned an image without a download URL",
    );
  }

  const response = await fetch(image.url);

  if (!response.ok) {
    throw new StoremetaError(
      "API_ERROR",
      `Failed to download a Google Play screenshot with ${response.status} ${response.statusText}`,
    );
  }

  return {
    buffer: new Uint8Array(await response.arrayBuffer()),
    extension: inferGoogleImageExtension(
      image.url,
      response.headers.get("content-type"),
    ),
  };
}

export async function downloadGoogleScreenshotSet(
  screenshotsBaseDir: string,
  screenshotSet: GoogleScreenshotSet,
): Promise<ScreenshotSetDescriptor> {
  const normalizedLocale = normalizeLocaleCode(screenshotSet.locale);

  if (screenshotSet.images.length === 0) {
    return {
      platform: "google",
      locale: normalizedLocale,
      assetType: screenshotSet.imageType,
      files: [],
    };
  }

  const files: ScreenshotDescriptor[] = [];

  for (const [index, image] of screenshotSet.images.entries()) {
    const position = index + 1;
    const downloadedImage = await downloadGoogleImage(image);
    const fileName = createGoogleDownloadedFileName(
      position,
      downloadedImage.extension,
    );
    const filePath = resolveScreenshotFilePath(screenshotsBaseDir, {
      platform: "google",
      locale: screenshotSet.locale,
      assetType: screenshotSet.imageType,
      fileName,
    });

    await ensureParentDirectory(filePath);

    try {
      await writeFile(filePath, downloadedImage.buffer);
    } catch (cause) {
      throw new StoremetaError(
        "FILESYSTEM_ERROR",
        `Failed to write Google Play screenshot ${screenshotSet.locale}/${screenshotSet.imageType}/${fileName}`,
        { cause },
      );
    }

    files.push({
      platform: "google",
      locale: normalizedLocale,
      assetType: screenshotSet.imageType,
      filePath,
      fileName,
      position,
    });
  }

  return {
    platform: "google",
    locale: normalizedLocale,
    assetType: screenshotSet.imageType,
    files,
  };
}
