import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";

const SUPPORTED_SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

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
      `Failed to read Apple screenshot directory at ${directoryPath}`,
      { cause },
    );
  }
}

function sortScreenshotFileNames(fileNames: string[]): string[] {
  return [...fileNames].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
    }),
  );
}

function validateAppleScreenshotFileNames(
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

function createAppleScreenshotDescriptors(
  screenshotsBaseDir: string,
  localeDirectoryName: string,
  locale: string,
  assetType: string,
  fileNames: string[],
): ScreenshotDescriptor[] {
  return sortScreenshotFileNames(fileNames).map((fileName, index) => ({
    platform: "apple",
    locale,
    assetType,
    filePath: resolve(
      screenshotsBaseDir,
      "apple",
      localeDirectoryName,
      assetType,
      fileName,
    ),
    fileName,
    position: index + 1,
  }));
}

export async function loadAppleScreenshotSets(
  screenshotsBaseDir: string,
): Promise<ScreenshotSetDescriptor[]> {
  const appleBaseDir = resolve(screenshotsBaseDir, "apple");
  const localeEntries = await listDirectoryEntries(appleBaseDir);
  const screenshotSets: ScreenshotSetDescriptor[] = [];

  for (const localeEntry of localeEntries) {
    if (!localeEntry.isDirectory()) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `${join(appleBaseDir, localeEntry.name)}: expected a locale directory`,
      );
    }

    const locale = normalizeLocaleCode(localeEntry.name);
    const localeDirectory = join(appleBaseDir, localeEntry.name);
    const assetTypeEntries = await listDirectoryEntries(localeDirectory);

    for (const assetTypeEntry of assetTypeEntries) {
      if (!assetTypeEntry.isDirectory()) {
        throw new StoremetaError(
          "VALIDATION_ERROR",
          `${join(localeDirectory, assetTypeEntry.name)}: expected a display type directory`,
        );
      }

      const assetTypeDirectory = join(localeDirectory, assetTypeEntry.name);
      const fileEntries = await listDirectoryEntries(assetTypeDirectory);
      const fileNames = fileEntries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);

      validateAppleScreenshotFileNames(assetTypeDirectory, fileNames);

      screenshotSets.push({
        platform: "apple",
        locale,
        assetType: assetTypeEntry.name,
        files: createAppleScreenshotDescriptors(
          screenshotsBaseDir,
          localeEntry.name,
          locale,
          assetTypeEntry.name,
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
