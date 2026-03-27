import { readFile, readdir } from "node:fs/promises";
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
import { GooglePlayClient } from "../client.js";
import {
  GOOGLE_SCREENSHOT_IMAGE_TYPES,
  type GooglePlayImage,
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

export interface GoogleScreenshotClearResult {
  targetLocale: string;
  imageType: GoogleScreenshotImageType;
  deleted: GooglePlayImage[];
}

interface GooglePlayDeleteImagesResponse {
  deleted?: GooglePlayImage[];
}

interface GooglePlayUploadImageResponse {
  image?: GooglePlayImage;
}

export interface GoogleScreenshotUploadResult {
  targetLocale: string;
  imageType: GoogleScreenshotImageType;
  position: number;
  filePath: string;
  image: GooglePlayImage;
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

function getGoogleScreenshotContentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  throw new StoremetaError(
    "VALIDATION_ERROR",
    `${filePath}: unsupported screenshot file extension`,
  );
}

export async function clearGoogleScreenshotTargets(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  uploadTargets: GoogleScreenshotUploadTarget[],
  options?: {
    clearExisting?: boolean;
  },
): Promise<GoogleScreenshotClearResult[]> {
  if (options?.clearExisting !== true) {
    return [];
  }

  const clearResults: GoogleScreenshotClearResult[] = [];
  const clearedTargets = new Set<string>();

  for (const uploadTarget of uploadTargets) {
    const targetKey = `${uploadTarget.targetLocale}:${uploadTarget.imageType}`;

    if (clearedTargets.has(targetKey)) {
      continue;
    }

    const response = await client.requestJson<GooglePlayDeleteImagesResponse>(
      `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(uploadTarget.targetLocale)}/${encodeURIComponent(uploadTarget.imageType)}`,
      {
        method: "DELETE",
      },
    );

    clearResults.push({
      targetLocale: uploadTarget.targetLocale,
      imageType: uploadTarget.imageType,
      deleted: response.deleted ?? [],
    });
    clearedTargets.add(targetKey);
  }

  return clearResults.sort((left, right) => {
    const localeOrder = left.targetLocale.localeCompare(right.targetLocale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    return left.imageType.localeCompare(right.imageType);
  });
}

export async function uploadGoogleScreenshotTarget(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  uploadTarget: GoogleScreenshotUploadTarget,
): Promise<GoogleScreenshotUploadResult[]> {
  const uploadResults: GoogleScreenshotUploadResult[] = [];

  for (const file of uploadTarget.files) {
    const contentType = getGoogleScreenshotContentType(file.filePath);
    const fileContents = await readFile(file.filePath);
    const response = await client.requestJson<GooglePlayUploadImageResponse>(
      `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(uploadTarget.targetLocale)}/${encodeURIComponent(uploadTarget.imageType)}?uploadType=media`,
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
        },
        body: fileContents,
      },
    );

    if (response.image === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `Google Play upload did not return image data for ${uploadTarget.targetLocale}/${uploadTarget.imageType}/${file.fileName}`,
      );
    }

    uploadResults.push({
      targetLocale: uploadTarget.targetLocale,
      imageType: uploadTarget.imageType,
      position: file.position,
      filePath: file.filePath,
      image: response.image,
    });
  }

  return uploadResults;
}

export async function uploadGoogleScreenshotTargets(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  uploadTargets: GoogleScreenshotUploadTarget[],
  options?: {
    onUploaded?: (result: GoogleScreenshotUploadResult) => void | Promise<void>;
  },
): Promise<GoogleScreenshotUploadResult[]> {
  const uploadResults: GoogleScreenshotUploadResult[] = [];

  for (const uploadTarget of uploadTargets) {
    for (const result of await uploadGoogleScreenshotTarget(
      client,
      packageName,
      editId,
      uploadTarget,
    )) {
      uploadResults.push(result);

      if (options?.onUploaded !== undefined) {
        await options.onUploaded(result);
      }
    }
  }

  return uploadResults.sort((left, right) => {
    const localeOrder = left.targetLocale.localeCompare(right.targetLocale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    const imageTypeOrder = left.imageType.localeCompare(right.imageType);

    if (imageTypeOrder !== 0) {
      return imageTypeOrder;
    }

    return left.position - right.position;
  });
}
