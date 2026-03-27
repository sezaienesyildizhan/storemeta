import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import {
  GOOGLE_SCREENSHOT_IMAGE_TYPES,
  type GoogleScreenshotImageType,
} from "./types.js";

const SUPPORTED_SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const GOOGLE_SCREENSHOT_IMAGE_TYPE_SET = new Set(GOOGLE_SCREENSHOT_IMAGE_TYPES);

async function listDirectoryEntries(directoryPath: string) {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    ) {
      return [];
    }

    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read Google screenshot directory at ${directoryPath}`,
      { cause },
    );
  }
}

function validateGoogleScreenshotAssetType(
  assetType: string,
  directoryPath: string,
): GoogleScreenshotImageType {
  if (GOOGLE_SCREENSHOT_IMAGE_TYPE_SET.has(assetType as GoogleScreenshotImageType)) {
    return assetType as GoogleScreenshotImageType;
  }

  throw new StoremetaError(
    "VALIDATION_ERROR",
    `${directoryPath}: unsupported Google screenshot image type`,
  );
}

function sortScreenshotFileNames(fileNames: string[]): string[] {
  return [...fileNames].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
    }),
  );
}

function validateGoogleScreenshotFileNames(
  assetTypeDirectory: string,
  fileNames: string[],
): void {
  for (const [index, fileName] of sortScreenshotFileNames(fileNames).entries()) {
    const extension = extname(fileName).toLowerCase();

    if (!SUPPORTED_SCREENSHOT_EXTENSIONS.has(extension)) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `${join(assetTypeDirectory, fileName)}: unsupported screenshot file extension`,
      );
    }

    const numericName = fileName.slice(0, Math.max(0, fileName.length - extension.length));

    if (!/^\d+$/u.test(numericName)) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `${join(assetTypeDirectory, fileName)}: expected a numeric filename`,
      );
    }

    if (Number(numericName) !== index + 1) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `${join(assetTypeDirectory, fileName)}: expected screenshot order ${index + 1}`,
      );
    }
  }
}

function createGoogleScreenshotDescriptors(
  screenshotsBaseDir: string,
  localeDirectoryName: string,
  locale: string,
  imageType: GoogleScreenshotImageType,
  fileNames: string[],
): ScreenshotDescriptor[] {
  return sortScreenshotFileNames(fileNames).map((fileName, index) => ({
    platform: "google",
    locale,
    assetType: imageType,
    filePath: resolve(
      screenshotsBaseDir,
      "google",
      localeDirectoryName,
      imageType,
      fileName,
    ),
    fileName,
    position: index + 1,
  }));
}

export async function loadGoogleScreenshotSets(
  screenshotsBaseDir: string,
): Promise<ScreenshotSetDescriptor[]> {
  const googleBaseDir = resolve(screenshotsBaseDir, "google");
  const localeEntries = await listDirectoryEntries(googleBaseDir);
  const screenshotSets: ScreenshotSetDescriptor[] = [];

  for (const localeEntry of localeEntries) {
    if (!localeEntry.isDirectory()) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `${join(googleBaseDir, localeEntry.name)}: expected a locale directory`,
      );
    }

    const locale = normalizeLocaleCode(localeEntry.name);
    const localeDirectory = join(googleBaseDir, localeEntry.name);
    const imageTypeEntries = await listDirectoryEntries(localeDirectory);

    for (const imageTypeEntry of imageTypeEntries) {
      if (!imageTypeEntry.isDirectory()) {
        throw new StoremetaError(
          "VALIDATION_ERROR",
          `${join(localeDirectory, imageTypeEntry.name)}: expected an image type directory`,
        );
      }

      const imageTypeDirectory = join(localeDirectory, imageTypeEntry.name);
      const imageType = validateGoogleScreenshotAssetType(
        imageTypeEntry.name,
        imageTypeDirectory,
      );
      const fileEntries = await listDirectoryEntries(imageTypeDirectory);
      const fileNames = fileEntries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);

      validateGoogleScreenshotFileNames(imageTypeDirectory, fileNames);

      screenshotSets.push({
        platform: "google",
        locale,
        assetType: imageType,
        files: createGoogleScreenshotDescriptors(
          screenshotsBaseDir,
          localeEntry.name,
          locale,
          imageType,
          fileNames,
        ),
      });
    }
  }

  return screenshotSets.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    return left.assetType.localeCompare(right.assetType);
  });
}
