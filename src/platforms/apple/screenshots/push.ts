import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import type { AppStoreConnectClient } from "../client.js";
import {
  postAppStoreConnectJson,
  requestAllAppStoreConnectPages,
} from "../client.js";
import { resolveEditableAppleAppStoreVersionResource } from "../metadata/push.js";
import type {
  AppleAppStoreVersionLocalizationData,
  AppleAppStoreVersionLocalizationPayload,
} from "../metadata/types.js";
import {
  fetchAppleScreenshotSetsForLocalizations,
  type AppleScreenshotSetData,
} from "./pull.js";

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

interface AppleAppStoreVersionLocalizationCreatePayload {
  data: {
    type: "appStoreVersionLocalizations";
    attributes: {
      locale: string;
    };
    relationships: {
      appStoreVersion: {
        data: {
          type: "appStoreVersions";
          id: string;
        };
      };
    };
  };
}

function mapAppleScreenshotLocaleToCreatePayload(
  locale: string,
  appStoreVersionId: string,
): AppleAppStoreVersionLocalizationCreatePayload {
  return {
    data: {
      type: "appStoreVersionLocalizations",
      attributes: {
        locale,
      },
      relationships: {
        appStoreVersion: {
          data: {
            type: "appStoreVersions",
            id: appStoreVersionId,
          },
        },
      },
    },
  };
}

async function listAppleAppStoreVersionLocalizations(
  client: AppStoreConnectClient,
  appStoreVersionId: string,
): Promise<AppleAppStoreVersionLocalizationData[]> {
  return requestAllAppStoreConnectPages<AppleAppStoreVersionLocalizationData>(
    client,
    `/appStoreVersions/${encodeURIComponent(appStoreVersionId)}/appStoreVersionLocalizations`,
  );
}

export async function resolveOrCreateAppleScreenshotLocalizations(
  client: AppStoreConnectClient,
  appId: string,
  screenshotSets: ScreenshotSetDescriptor[],
): Promise<AppleAppStoreVersionLocalizationData[]> {
  const appStoreVersion = await resolveEditableAppleAppStoreVersionResource(
    client,
    appId,
  );
  const existingLocalizations = await listAppleAppStoreVersionLocalizations(
    client,
    appStoreVersion.id,
  );
  const localizationsByLocale = new Map(
    existingLocalizations
      .filter((localization) => localization.attributes.locale !== undefined)
      .map((localization) => [localization.attributes.locale!, localization] as const),
  );
  const requiredLocales = [...new Set(screenshotSets.map((set) => set.locale))].sort(
    (left, right) => left.localeCompare(right),
  );

  for (const locale of requiredLocales) {
    if (localizationsByLocale.has(locale)) {
      continue;
    }

    const response =
      await postAppStoreConnectJson<AppleAppStoreVersionLocalizationPayload>(
        client,
        "/appStoreVersionLocalizations",
        mapAppleScreenshotLocaleToCreatePayload(locale, appStoreVersion.id),
      );

    if (response.data.id === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect did not return an app store version localization id for locale ${locale}`,
      );
    }

    localizationsByLocale.set(locale, response.data);
  }

  return requiredLocales.map((locale) => {
    const localization = localizationsByLocale.get(locale);

    if (localization === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect did not return an app store version localization for locale ${locale}`,
      );
    }

    return localization;
  });
}

interface AppleScreenshotSetCreatePayload {
  data: {
    type: "appScreenshotSets";
    attributes: {
      screenshotDisplayType: string;
    };
    relationships: {
      appStoreVersionLocalization: {
        data: {
          type: "appStoreVersionLocalizations";
          id: string;
        };
      };
    };
  };
}

function mapAppleScreenshotSetToCreatePayload(
  localizationId: string,
  screenshotDisplayType: string,
): AppleScreenshotSetCreatePayload {
  return {
    data: {
      type: "appScreenshotSets",
      attributes: {
        screenshotDisplayType,
      },
      relationships: {
        appStoreVersionLocalization: {
          data: {
            type: "appStoreVersionLocalizations",
            id: localizationId,
          },
        },
      },
    },
  };
}

export interface AppleScreenshotUploadTarget extends ScreenshotSetDescriptor {
  localizationId: string;
  screenshotSetId: string;
}

export async function resolveOrCreateAppleScreenshotUploadTargets(
  client: AppStoreConnectClient,
  localizations: AppleAppStoreVersionLocalizationData[],
  screenshotSets: ScreenshotSetDescriptor[],
): Promise<AppleScreenshotUploadTarget[]> {
  const localizationsByLocale = new Map(
    localizations
      .filter(
        (
          localization,
        ): localization is AppleAppStoreVersionLocalizationData & {
          id: string;
          attributes: {
            locale: string;
          };
        } =>
          localization.id !== undefined &&
          localization.attributes.locale !== undefined,
      )
      .map((localization) => [localization.attributes.locale, localization] as const),
  );
  const existingScreenshotSets = await fetchAppleScreenshotSetsForLocalizations(
    client,
    localizations,
  );
  const screenshotSetsByTargetKey = new Map<string, AppleScreenshotSetData>();

  for (const localization of existingScreenshotSets) {
    for (const screenshotSet of localization.screenshotSets) {
      const displayType = screenshotSet.attributes?.screenshotDisplayType;

      if (displayType === undefined) {
        continue;
      }

      screenshotSetsByTargetKey.set(
        `${localization.localizationId}:${displayType}`,
        screenshotSet,
      );
    }
  }

  const uploadTargets: AppleScreenshotUploadTarget[] = [];

  for (const screenshotSet of screenshotSets) {
    const localization = localizationsByLocale.get(screenshotSet.locale);

    if (localization === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect did not return an app store version localization for locale ${screenshotSet.locale}`,
      );
    }

    const targetKey = `${localization.id}:${screenshotSet.assetType}`;
    let targetScreenshotSet = screenshotSetsByTargetKey.get(targetKey);

    if (targetScreenshotSet === undefined) {
      const response = await postAppStoreConnectJson<{ data: AppleScreenshotSetData }>(
        client,
        "/appScreenshotSets",
        mapAppleScreenshotSetToCreatePayload(
          localization.id,
          screenshotSet.assetType,
        ),
      );

      if (response.data.id === undefined) {
        throw new StoremetaError(
          "API_ERROR",
          `App Store Connect did not return an app screenshot set id for locale ${screenshotSet.locale} and display type ${screenshotSet.assetType}`,
        );
      }

      targetScreenshotSet = response.data;
      screenshotSetsByTargetKey.set(targetKey, targetScreenshotSet);
    }

    uploadTargets.push({
      ...screenshotSet,
      localizationId: localization.id,
      screenshotSetId: targetScreenshotSet.id,
    });
  }

  return uploadTargets.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    return left.assetType.localeCompare(right.assetType);
  });
}
