import { normalizeLocaleCode } from "../../../locales/normalize.js";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { ensureParentDirectory } from "../../../writers/ensure-directory.js";
import { orderScreenshotsForWrite } from "../../../writers/order-screenshots.js";
import { resolveScreenshotFilePath } from "../../../writers/resolve-screenshot-path.js";
import type { AppStoreConnectClient } from "../client.js";
import { requestAllAppStoreConnectPages } from "../client.js";
import {
  fetchAppleAppStoreVersionLocalizations,
} from "../metadata/pull.js";
import type { AppleAppStoreVersionLocalizationData } from "../metadata/types.js";

export async function fetchAppleScreenshotLocalizations(
  client: AppStoreConnectClient,
  appId: string,
): Promise<AppleAppStoreVersionLocalizationData[]> {
  return fetchAppleAppStoreVersionLocalizations(client, appId);
}

export function filterAppleScreenshotLocalizationsByLocale(
  localizations: AppleAppStoreVersionLocalizationData[],
  locale: string | undefined,
): AppleAppStoreVersionLocalizationData[] {
  if (locale === undefined) {
    return localizations;
  }

  const normalizedLocale = normalizeLocaleCode(locale);

  return localizations.filter(
    (localization) =>
      normalizeLocaleCode(localization.attributes.locale ?? "") ===
      normalizedLocale,
  );
}

export interface AppleScreenshotSetAttributes {
  screenshotDisplayType?: string;
}

export interface AppleScreenshotSetData {
  id: string;
  type: "appScreenshotSets";
  attributes?: AppleScreenshotSetAttributes;
}

export interface AppleLocalizationScreenshotSets {
  localizationId: string;
  locale?: string;
  screenshotSets: AppleScreenshotSetData[];
}

export interface AppleScreenshotAttributes {
  fileName?: string;
  imageAsset?: {
    templateUrl?: string;
    url?: string;
    width?: number;
    height?: number;
  };
  assetDeliveryState?: {
    state?: string;
  };
  sourceFileChecksum?: string;
}

export interface AppleScreenshotData {
  id: string;
  type: "appScreenshots";
  attributes?: AppleScreenshotAttributes;
}

export interface AppleScreenshotSetWithScreenshots {
  localizationId: string;
  locale?: string;
  screenshotSet: AppleScreenshotSetData;
  screenshots: AppleScreenshotData[];
}

export async function fetchAppleScreenshotSetsForLocalizations(
  client: AppStoreConnectClient,
  localizations: AppleAppStoreVersionLocalizationData[],
): Promise<AppleLocalizationScreenshotSets[]> {
  const results: AppleLocalizationScreenshotSets[] = [];

  for (const localization of localizations) {
    if (localization.id === undefined) {
      continue;
    }

    const screenshotSets = await requestAllAppStoreConnectPages<AppleScreenshotSetData>(
      client,
      `/appStoreVersionLocalizations/${encodeURIComponent(localization.id)}/appScreenshotSets`,
    );

    results.push({
      localizationId: localization.id,
      locale: localization.attributes.locale,
      screenshotSets,
    });
  }

  return results.sort((left, right) =>
    (left.locale ?? left.localizationId).localeCompare(
      right.locale ?? right.localizationId,
    ),
  );
}

export async function fetchAppleScreenshotsForSets(
  client: AppStoreConnectClient,
  screenshotSetsByLocalization: AppleLocalizationScreenshotSets[],
): Promise<AppleScreenshotSetWithScreenshots[]> {
  const results: AppleScreenshotSetWithScreenshots[] = [];

  for (const localization of screenshotSetsByLocalization) {
    for (const screenshotSet of localization.screenshotSets) {
      const screenshots = await requestAllAppStoreConnectPages<AppleScreenshotData>(
        client,
        `/appScreenshotSets/${encodeURIComponent(screenshotSet.id)}/appScreenshots`,
      );

      results.push({
        localizationId: localization.localizationId,
        locale: localization.locale,
        screenshotSet,
        screenshots,
      });
    }
  }

  return results.sort((left, right) => {
    const localeOrder = (left.locale ?? left.localizationId).localeCompare(
      right.locale ?? right.localizationId,
    );

    if (localeOrder !== 0) {
      return localeOrder;
    }

    return left.screenshotSet.id.localeCompare(right.screenshotSet.id);
  });
}

function resolveAppleScreenshotExtension(
  screenshot: AppleScreenshotData,
  contentType?: string | null,
): string {
  if (contentType?.includes("png")) {
    return ".png";
  }

  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return ".jpg";
  }

  const fileNameExtension = extname(screenshot.attributes?.fileName ?? "").toLowerCase();

  if (fileNameExtension.length > 0) {
    return fileNameExtension;
  }

  return ".png";
}

function replaceAppleImageAssetTemplateValue(
  templateUrl: string,
  token: string,
  value: string | number | undefined,
): string {
  if (!templateUrl.includes(token)) {
    return templateUrl;
  }

  if (value === undefined) {
    throw new StoremetaError(
      "API_ERROR",
      `Apple screenshot image asset is missing ${token} data for template expansion`,
    );
  }

  return templateUrl.replaceAll(token, String(value));
}

function resolveAppleScreenshotDownloadUrl(screenshot: AppleScreenshotData): string {
  const imageAsset = screenshot.attributes?.imageAsset;

  if (imageAsset?.url !== undefined && imageAsset.url.trim().length > 0) {
    return imageAsset.url;
  }

  if (
    imageAsset?.templateUrl !== undefined &&
    imageAsset.templateUrl.trim().length > 0
  ) {
    const extension = resolveAppleScreenshotExtension(screenshot).replace(/^\./u, "");
    let downloadUrl = imageAsset.templateUrl;

    downloadUrl = replaceAppleImageAssetTemplateValue(
      downloadUrl,
      "{w}",
      imageAsset.width,
    );
    downloadUrl = replaceAppleImageAssetTemplateValue(
      downloadUrl,
      "{h}",
      imageAsset.height,
    );
    downloadUrl = replaceAppleImageAssetTemplateValue(downloadUrl, "{f}", extension);

    return downloadUrl;
  }

  throw new StoremetaError(
    "API_ERROR",
    `Apple screenshot ${screenshot.id} does not include a downloadable image asset`,
  );
}

export async function downloadAppleScreenshot(
  screenshot: AppleScreenshotData,
): Promise<{ buffer: Uint8Array; extension: string }> {
  const response = await fetch(resolveAppleScreenshotDownloadUrl(screenshot));

  if (!response.ok) {
    throw new StoremetaError(
      "API_ERROR",
      `Failed to download Apple screenshot ${screenshot.id} with ${response.status} ${response.statusText}`,
    );
  }

  return {
    buffer: new Uint8Array(await response.arrayBuffer()),
    extension: resolveAppleScreenshotExtension(
      screenshot,
      response.headers.get("content-type"),
    ),
  };
}

function resolveAppleScreenshotFileName(
  screenshot: AppleScreenshotData,
  extension: string,
): string {
  const sourceFileName = screenshot.attributes?.fileName;

  if (sourceFileName !== undefined && sourceFileName.trim().length > 0) {
    return sourceFileName;
  }

  return `${screenshot.id}${extension}`;
}

export async function downloadAppleScreenshotSet(
  screenshotsBaseDir: string,
  screenshotSet: AppleScreenshotSetWithScreenshots,
): Promise<ScreenshotSetDescriptor> {
  const locale = normalizeLocaleCode(screenshotSet.locale ?? "en-US");
  const assetType =
    screenshotSet.screenshotSet.attributes?.screenshotDisplayType ??
    screenshotSet.screenshotSet.id;
  const downloadedScreenshots: Array<{
    descriptor: ScreenshotDescriptor;
    buffer: Uint8Array;
  }> = [];

  for (const [index, screenshot] of screenshotSet.screenshots.entries()) {
    const position = index + 1;
    const downloadedScreenshot = await downloadAppleScreenshot(screenshot);
    const fileName = resolveAppleScreenshotFileName(
      screenshot,
      downloadedScreenshot.extension,
    );
    downloadedScreenshots.push({
      descriptor: {
        platform: "apple",
        locale,
        assetType,
        filePath: "",
        fileName,
        position,
      },
      buffer: downloadedScreenshot.buffer,
    });
  }

  const orderedFiles = orderScreenshotsForWrite(
    downloadedScreenshots.map((screenshot) => screenshot.descriptor),
  );
  const files: ScreenshotDescriptor[] = [];

  for (const [index, orderedFile] of orderedFiles.entries()) {
    const filePath = resolveScreenshotFilePath(screenshotsBaseDir, {
      platform: "apple",
      locale,
      assetType,
      fileName: orderedFile.fileName,
    });

    await ensureParentDirectory(filePath);

    try {
      await writeFile(filePath, downloadedScreenshots[index]!.buffer);
    } catch (cause) {
      throw new StoremetaError(
        "FILESYSTEM_ERROR",
        `Failed to write Apple screenshot ${locale}/${assetType}/${orderedFile.fileName}`,
        { cause },
      );
    }

    files.push({
      ...orderedFile,
      filePath,
    });
  }

  return {
    platform: "apple",
    locale,
    assetType,
    files,
  };
}
