import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type {
  ScreenshotDescriptor,
  ScreenshotSetDescriptor,
} from "../../../formats/screenshot-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import type { AppStoreConnectClient } from "../client.js";
import {
  patchAppStoreConnectJson,
  postAppStoreConnectJson,
  requestAllAppStoreConnectPages,
} from "../client.js";
import { resolveEditableAppleAppStoreVersionResource } from "../metadata/push.js";
import type {
  AppleAppStoreVersionLocalizationData,
  AppleAppStoreVersionLocalizationPayload,
} from "../metadata/types.js";
import {
  fetchAppleScreenshotsForSets,
  fetchAppleScreenshotSetsForLocalizations,
  type AppleLocalizationScreenshotSets,
  type AppleScreenshotData,
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

export interface AppleScreenshotClearResult {
  locale: string;
  assetType: string;
  screenshotSetId: string;
  deletedScreenshotIds: string[];
}

function mapUploadTargetsToAppleLocalizationScreenshotSets(
  uploadTargets: AppleScreenshotUploadTarget[],
): AppleLocalizationScreenshotSets[] {
  const targetsByLocalization = new Map<string, AppleLocalizationScreenshotSets>();

  for (const uploadTarget of uploadTargets) {
    const existingLocalization = targetsByLocalization.get(uploadTarget.localizationId);

    if (existingLocalization !== undefined) {
      existingLocalization.screenshotSets.push({
        id: uploadTarget.screenshotSetId,
        type: "appScreenshotSets",
        attributes: {
          screenshotDisplayType: uploadTarget.assetType,
        },
      });
      continue;
    }

    targetsByLocalization.set(uploadTarget.localizationId, {
      localizationId: uploadTarget.localizationId,
      locale: uploadTarget.locale,
      screenshotSets: [
        {
          id: uploadTarget.screenshotSetId,
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: uploadTarget.assetType,
          },
        },
      ],
    });
  }

  return [...targetsByLocalization.values()].sort((left, right) =>
    (left.locale ?? left.localizationId).localeCompare(
      right.locale ?? right.localizationId,
    ),
  );
}

export async function clearAppleScreenshotUploadTargets(
  client: AppStoreConnectClient,
  uploadTargets: AppleScreenshotUploadTarget[],
  options?: {
    clearExisting?: boolean;
  },
): Promise<AppleScreenshotClearResult[]> {
  if (options?.clearExisting !== true) {
    return [];
  }

  const screenshotsBySet = await fetchAppleScreenshotsForSets(
    client,
    mapUploadTargetsToAppleLocalizationScreenshotSets(uploadTargets),
  );
  const deletedResults: AppleScreenshotClearResult[] = [];

  for (const screenshotSet of screenshotsBySet) {
    const deletedScreenshotIds: string[] = [];

    for (const screenshot of screenshotSet.screenshots) {
      await client.request(`/appScreenshots/${encodeURIComponent(screenshot.id)}`, {
        method: "DELETE",
      });
      deletedScreenshotIds.push(screenshot.id);
    }

    deletedResults.push({
      locale: screenshotSet.locale ?? screenshotSet.localizationId,
      assetType:
        screenshotSet.screenshotSet.attributes?.screenshotDisplayType ??
        screenshotSet.screenshotSet.id,
      screenshotSetId: screenshotSet.screenshotSet.id,
      deletedScreenshotIds,
    });
  }

  return deletedResults.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    return left.assetType.localeCompare(right.assetType);
  });
}

export interface AppleUploadOperation {
  method?: string;
  url?: string;
  length?: number;
  offset?: number;
  requestHeaders?: Array<{
    name?: string;
    value?: string;
  }>;
}

interface AppleAppScreenshotReservationAttributes {
  fileName?: string;
  fileSize?: number;
  uploadOperations?: AppleUploadOperation[];
}

interface AppleAppScreenshotReservationData {
  id?: string;
  type: "appScreenshots";
  attributes?: AppleAppScreenshotReservationAttributes;
}

interface AppleAppScreenshotReservationPayload {
  data: {
    type: "appScreenshots";
    attributes: {
      fileName: string;
      fileSize: number;
    };
    relationships: {
      appScreenshotSet: {
        data: {
          type: "appScreenshotSets";
          id: string;
        };
      };
    };
  };
}

function mapAppleScreenshotReservationPayload(
  screenshotSetId: string,
  fileName: string,
  fileSize: number,
): AppleAppScreenshotReservationPayload {
  return {
    data: {
      type: "appScreenshots",
      attributes: {
        fileName,
        fileSize,
      },
      relationships: {
        appScreenshotSet: {
          data: {
            type: "appScreenshotSets",
            id: screenshotSetId,
          },
        },
      },
    },
  };
}

export interface AppleReservedScreenshotUpload {
  locale: string;
  assetType: string;
  screenshotSetId: string;
  screenshotId: string;
  file: ScreenshotDescriptor;
  uploadOperations: AppleUploadOperation[];
}

export async function reserveAppleScreenshotUploads(
  client: AppStoreConnectClient,
  uploadTargets: AppleScreenshotUploadTarget[],
): Promise<AppleReservedScreenshotUpload[]> {
  const reservations: AppleReservedScreenshotUpload[] = [];

  for (const uploadTarget of uploadTargets) {
    for (const file of uploadTarget.files) {
      const fileStats = await stat(file.filePath);
      const response = await postAppStoreConnectJson<{
        data: AppleAppScreenshotReservationData;
      }>(
        client,
        "/appScreenshots",
        mapAppleScreenshotReservationPayload(
          uploadTarget.screenshotSetId,
          file.fileName,
          fileStats.size,
        ),
      );
      const screenshotId = response.data.id;
      const uploadOperations = response.data.attributes?.uploadOperations;

      if (screenshotId === undefined) {
        throw new StoremetaError(
          "API_ERROR",
          `App Store Connect did not return an app screenshot id for ${uploadTarget.locale}/${uploadTarget.assetType}/${file.fileName}`,
        );
      }

      if (uploadOperations === undefined || uploadOperations.length === 0) {
        throw new StoremetaError(
          "API_ERROR",
          `App Store Connect did not return upload operations for ${uploadTarget.locale}/${uploadTarget.assetType}/${file.fileName}`,
        );
      }

      reservations.push({
        locale: uploadTarget.locale,
        assetType: uploadTarget.assetType,
        screenshotSetId: uploadTarget.screenshotSetId,
        screenshotId,
        file,
        uploadOperations,
      });
    }
  }

  return reservations.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    const assetTypeOrder = left.assetType.localeCompare(right.assetType);

    if (assetTypeOrder !== 0) {
      return assetTypeOrder;
    }

    return left.file.position - right.file.position;
  });
}

function resolveAppleUploadOperationHeaders(
  uploadOperation: AppleUploadOperation,
): Record<string, string> {
  const headers = Object.fromEntries(
    (uploadOperation.requestHeaders ?? [])
      .filter(
        (
          header,
        ): header is {
          name: string;
          value: string;
        } => header.name !== undefined && header.value !== undefined,
      )
      .map((header) => [header.name, header.value]),
  );

  if (Object.keys(headers).length === 0) {
    throw new StoremetaError(
      "API_ERROR",
      "Apple upload operation did not return request headers",
    );
  }

  return headers;
}

function sliceAppleUploadChunk(
  fileBuffer: Buffer,
  uploadOperation: AppleUploadOperation,
): Buffer {
  if (uploadOperation.offset === undefined || uploadOperation.length === undefined) {
    throw new StoremetaError(
      "API_ERROR",
      "Apple upload operation did not return offset and length information",
    );
  }

  return fileBuffer.subarray(
    uploadOperation.offset,
    uploadOperation.offset + uploadOperation.length,
  );
}

function convertAppleUploadChunkToArrayBuffer(chunk: Buffer): ArrayBuffer {
  return chunk.buffer.slice(
    chunk.byteOffset,
    chunk.byteOffset + chunk.byteLength,
  ) as ArrayBuffer;
}

export interface AppleUploadedScreenshotResult {
  locale: string;
  assetType: string;
  screenshotId: string;
  filePath: string;
}

export async function uploadReservedAppleScreenshot(
  reservation: AppleReservedScreenshotUpload,
): Promise<AppleUploadedScreenshotResult> {
  const fileBuffer = await readFile(reservation.file.filePath);

  for (const uploadOperation of reservation.uploadOperations) {
    if (
      uploadOperation.method === undefined ||
      uploadOperation.url === undefined ||
      uploadOperation.url.trim().length === 0
    ) {
      throw new StoremetaError(
        "API_ERROR",
        `Apple upload operation is missing method or URL for ${reservation.locale}/${reservation.assetType}/${reservation.file.fileName}`,
      );
    }

    const response = await fetch(uploadOperation.url, {
      method: uploadOperation.method,
      headers: resolveAppleUploadOperationHeaders(uploadOperation),
      body: convertAppleUploadChunkToArrayBuffer(
        sliceAppleUploadChunk(fileBuffer, uploadOperation),
      ),
    });

    if (!response.ok) {
      throw new StoremetaError(
        "API_ERROR",
        `Apple screenshot upload failed for ${reservation.locale}/${reservation.assetType}/${reservation.file.fileName} with ${response.status} ${response.statusText}`,
      );
    }
  }

  return {
    locale: reservation.locale,
    assetType: reservation.assetType,
    screenshotId: reservation.screenshotId,
    filePath: reservation.file.filePath,
  };
}

export async function uploadReservedAppleScreenshots(
  reservations: AppleReservedScreenshotUpload[],
): Promise<AppleUploadedScreenshotResult[]> {
  const uploadResults: AppleUploadedScreenshotResult[] = [];

  for (const reservation of reservations) {
    uploadResults.push(await uploadReservedAppleScreenshot(reservation));
  }

  return uploadResults.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    const assetTypeOrder = left.assetType.localeCompare(right.assetType);

    if (assetTypeOrder !== 0) {
      return assetTypeOrder;
    }

    return left.filePath.localeCompare(right.filePath);
  });
}

interface AppleAppScreenshotCommitPayload {
  data: {
    id: string;
    type: "appScreenshots";
    attributes: {
      uploaded: true;
      sourceFileChecksum: string;
    };
  };
}

function createAppleScreenshotChecksum(fileContents: Buffer): string {
  return createHash("md5").update(fileContents).digest("hex");
}

function mapAppleScreenshotCommitPayload(
  screenshotId: string,
  sourceFileChecksum: string,
): AppleAppScreenshotCommitPayload {
  return {
    data: {
      id: screenshotId,
      type: "appScreenshots",
      attributes: {
        uploaded: true,
        sourceFileChecksum,
      },
    },
  };
}

export interface AppleCommittedScreenshotResult {
  locale: string;
  assetType: string;
  screenshotId: string;
  filePath: string;
  sourceFileChecksum: string;
}

export async function commitAppleScreenshotUpload(
  client: AppStoreConnectClient,
  reservation: AppleReservedScreenshotUpload,
): Promise<AppleCommittedScreenshotResult> {
  const fileContents = await readFile(reservation.file.filePath);
  const sourceFileChecksum = createAppleScreenshotChecksum(fileContents);

  await patchAppStoreConnectJson(
    client,
    `/appScreenshots/${encodeURIComponent(reservation.screenshotId)}`,
    mapAppleScreenshotCommitPayload(
      reservation.screenshotId,
      sourceFileChecksum,
    ),
  );

  return {
    locale: reservation.locale,
    assetType: reservation.assetType,
    screenshotId: reservation.screenshotId,
    filePath: reservation.file.filePath,
    sourceFileChecksum,
  };
}

export async function commitAppleScreenshotUploads(
  client: AppStoreConnectClient,
  reservations: AppleReservedScreenshotUpload[],
): Promise<AppleCommittedScreenshotResult[]> {
  const commitResults: AppleCommittedScreenshotResult[] = [];

  for (const reservation of reservations) {
    commitResults.push(await commitAppleScreenshotUpload(client, reservation));
  }

  return commitResults.sort((left, right) => {
    const localeOrder = left.locale.localeCompare(right.locale);

    if (localeOrder !== 0) {
      return localeOrder;
    }

    const assetTypeOrder = left.assetType.localeCompare(right.assetType);

    if (assetTypeOrder !== 0) {
      return assetTypeOrder;
    }

    return left.filePath.localeCompare(right.filePath);
  });
}
