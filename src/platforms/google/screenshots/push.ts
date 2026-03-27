import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  GoogleAppSettings,
  GoogleScreenshotSettings,
  LocaleSettings,
} from "../../../config/types.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { listScreenshotGroups } from "../../../locales/groups.js";
import { mapLocaleCode, mapLocaleCodes } from "../../../locales/map.js";
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

function resolveGoogleScreenshotGroupLocales(
  sourceLocale: string,
  localeSettings: LocaleSettings | undefined,
  screenshotSettings: GoogleScreenshotSettings | undefined,
): string[] {
  const mappedSourceLocale = mapLocaleCode(sourceLocale, localeSettings);
  const matchingGroups = listScreenshotGroups(screenshotSettings).filter((group) => {
    const mappedGroupLocales = mapLocaleCodes(group.locales, localeSettings);

    return (
      group.locales.includes(sourceLocale) ||
      group.locales.includes(mappedSourceLocale) ||
      mappedGroupLocales.includes(mappedSourceLocale)
    );
  });

  if (matchingGroups.length > 1) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Google screenshot locale ${sourceLocale} matches multiple screenshot groups`,
    );
  }

  if (matchingGroups.length === 0) {
    return [mappedSourceLocale];
  }

  const mappedGroupLocales = mapLocaleCodes(
    matchingGroups[0]!.locales,
    localeSettings,
  );
  const uniqueLocales = new Set(mappedGroupLocales);

  if (uniqueLocales.size !== mappedGroupLocales.length) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Google screenshot group ${matchingGroups[0]!.name} resolves to duplicate target locales`,
    );
  }

  return mappedGroupLocales;
}

export interface GoogleScreenshotUploadTarget extends ScreenshotSetDescriptor {
  sourceLocale: string;
  targetLocale: string;
  imageType: GoogleScreenshotImageType;
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

export function mapGoogleScreenshotSetsToTargets(
  screenshotSets: ScreenshotSetDescriptor[],
  settings: Pick<GoogleAppSettings, "locales" | "screenshots">,
): GoogleScreenshotUploadTarget[] {
  const uploadTargets: GoogleScreenshotUploadTarget[] = [];
  const seenTargets = new Map<string, string>();

  for (const screenshotSet of screenshotSets) {
    const imageType = validateGoogleScreenshotAssetType(
      screenshotSet.assetType,
      screenshotSet.assetType,
    );
    const sourceLocale = normalizeLocaleCode(screenshotSet.locale);
    const targetLocales = resolveGoogleScreenshotGroupLocales(
      sourceLocale,
      settings.locales,
      settings.screenshots,
    );

    for (const targetLocale of targetLocales) {
      const targetKey = `${targetLocale}:${imageType}`;
      const existingSourceLocale = seenTargets.get(targetKey);

      if (existingSourceLocale !== undefined && existingSourceLocale !== sourceLocale) {
        throw new StoremetaError(
          "VALIDATION_ERROR",
          `Google screenshot target ${targetLocale}/${imageType} is defined by both ${existingSourceLocale} and ${sourceLocale}`,
        );
      }

      seenTargets.set(targetKey, sourceLocale);
      uploadTargets.push({
        platform: "google",
        locale: targetLocale,
        targetLocale,
        sourceLocale,
        assetType: imageType,
        imageType,
        files: screenshotSet.files.map((file) => ({
          ...file,
          locale: targetLocale,
          assetType: imageType,
        })),
      });
    }
  }

  return uploadTargets.sort((left, right) => {
    const localeOrder = left.targetLocale.localeCompare(right.targetLocale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    const imageTypeOrder = left.imageType.localeCompare(right.imageType);

    if (imageTypeOrder !== 0) {
      return imageTypeOrder;
    }

    return left.sourceLocale.localeCompare(right.sourceLocale);
  });
}
