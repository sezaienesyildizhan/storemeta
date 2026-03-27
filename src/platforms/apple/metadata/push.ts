import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type { AppleMetadataDocument } from "../../../formats/metadata-types.js";
import {
  loadMarkdownMetadataFile,
  loadYamlMetadataFile,
  loadYmlMetadataFile,
} from "../../../formats/load-metadata.js";
import type { AppStoreConnectClient } from "../client.js";
import {
  patchAppStoreConnectJson,
  requestAllAppStoreConnectPages,
} from "../client.js";
import type {
  AppleAppInfoLocalizationData,
  AppleAppInfoLocalizationPayload,
} from "./types.js";
import { validateAppleMetadataDocument } from "../../../validation/metadata/apple.js";

async function listAppleMetadataFiles(metadataBaseDir: string): Promise<string[]> {
  const appleMetadataDirectory = resolve(metadataBaseDir, "apple");

  try {
    const entries = await readdir(appleMetadataDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(appleMetadataDirectory, entry.name))
      .sort((left, right) => left.localeCompare(right));
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
      `Failed to read Apple metadata directory at ${appleMetadataDirectory}`,
      { cause },
    );
  }
}

async function loadAppleMetadataDocument(
  filePath: string,
): Promise<AppleMetadataDocument | undefined> {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".yml") {
    return validateAppleMetadataDocument((await loadYmlMetadataFile(filePath)).parsed);
  }

  if (extension === ".yaml") {
    return validateAppleMetadataDocument((await loadYamlMetadataFile(filePath)).parsed);
  }

  if (extension === ".md") {
    return validateAppleMetadataDocument(
      (await loadMarkdownMetadataFile(filePath)).parsed,
    );
  }

  return undefined;
}

export async function loadAppleMetadataDocuments(
  metadataBaseDir: string,
): Promise<AppleMetadataDocument[]> {
  const documents: AppleMetadataDocument[] = [];

  for (const filePath of await listAppleMetadataFiles(metadataBaseDir)) {
    const document = await loadAppleMetadataDocument(filePath);

    if (document !== undefined) {
      documents.push(document);
    }
  }

  return documents.sort((left, right) => left.locale.localeCompare(right.locale));
}

interface AppleAppInfoAttributes {
  appStoreState?: string;
  platform?: "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";
}

export interface AppleAppInfoResource {
  id: string;
  type: "appInfos";
  attributes?: AppleAppInfoAttributes;
}

export function selectAppleAppInfoResource(
  appInfos: AppleAppInfoResource[],
): AppleAppInfoResource | undefined {
  const iosAppInfo = appInfos.find(
    (appInfo) => appInfo.attributes?.platform === "IOS",
  );

  return iosAppInfo ?? appInfos[0];
}

export async function resolveAppleAppInfoResource(
  client: AppStoreConnectClient,
  appId: string,
): Promise<AppleAppInfoResource> {
  const appInfos = await requestAllAppStoreConnectPages<AppleAppInfoResource>(
    client,
    `/apps/${encodeURIComponent(appId)}/appInfos`,
  );
  const selectedAppInfo = selectAppleAppInfoResource(appInfos);

  if (selectedAppInfo === undefined) {
    throw new StoremetaError(
      "API_ERROR",
      `App Store Connect returned no app info resource for app ${appId}`,
    );
  }

  return selectedAppInfo;
}

type AppleAppStoreState =
  | "ACCEPTED"
  | "DEVELOPER_REJECTED"
  | "IN_REVIEW"
  | "INVALID_BINARY"
  | "METADATA_REJECTED"
  | "NOT_APPLICABLE"
  | "PENDING_APPLE_RELEASE"
  | "PENDING_CONTRACT"
  | "PENDING_DEVELOPER_RELEASE"
  | "PREPARE_FOR_SUBMISSION"
  | "PREORDER_READY_FOR_SALE"
  | "PROCESSING_FOR_APP_STORE"
  | "READY_FOR_REVIEW"
  | "READY_FOR_SALE"
  | "REJECTED"
  | "REMOVED_FROM_SALE"
  | "REPLACED_WITH_NEW_VERSION"
  | "WAITING_FOR_EXPORT_COMPLIANCE"
  | "WAITING_FOR_REVIEW";

const EDITABLE_APP_STORE_STATES = new Set<AppleAppStoreState>([
  "PREPARE_FOR_SUBMISSION",
  "READY_FOR_REVIEW",
  "INVALID_BINARY",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "ACCEPTED",
  "WAITING_FOR_EXPORT_COMPLIANCE",
  "PENDING_DEVELOPER_RELEASE",
  "REJECTED",
  "METADATA_REJECTED",
  "DEVELOPER_REJECTED",
]);

interface AppleAppStoreVersionAttributes {
  platform?: "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";
  appStoreState?: AppleAppStoreState;
  createdDate?: string;
}

export interface AppleAppStoreVersionResource {
  id: string;
  type: "appStoreVersions";
  attributes?: AppleAppStoreVersionAttributes;
}

function getAppleVersionCreatedTimestamp(
  version: AppleAppStoreVersionResource,
): number {
  const createdDate = version.attributes?.createdDate;

  if (createdDate === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(createdDate);

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function selectEditableAppleAppStoreVersion(
  versions: AppleAppStoreVersionResource[],
): AppleAppStoreVersionResource | undefined {
  const sortedVersions = [...versions].sort((left, right) => {
    if (left.attributes?.platform === "IOS" && right.attributes?.platform !== "IOS") {
      return -1;
    }

    if (left.attributes?.platform !== "IOS" && right.attributes?.platform === "IOS") {
      return 1;
    }

    const createdDateOrder =
      getAppleVersionCreatedTimestamp(right) - getAppleVersionCreatedTimestamp(left);

    if (createdDateOrder !== 0) {
      return createdDateOrder;
    }

    return right.id.localeCompare(left.id);
  });

  return sortedVersions.find((version) => {
    const state = version.attributes?.appStoreState;

    return state !== undefined && EDITABLE_APP_STORE_STATES.has(state);
  });
}

export async function resolveEditableAppleAppStoreVersionResource(
  client: AppStoreConnectClient,
  appId: string,
): Promise<AppleAppStoreVersionResource> {
  const appStoreVersions =
    await requestAllAppStoreConnectPages<AppleAppStoreVersionResource>(
      client,
      `/apps/${encodeURIComponent(appId)}/appStoreVersions`,
    );
  const selectedVersion = selectEditableAppleAppStoreVersion(appStoreVersions);

  if (selectedVersion === undefined) {
    throw new StoremetaError(
      "API_ERROR",
      `App Store Connect returned no editable app store version for app ${appId}`,
    );
  }

  return selectedVersion;
}

function mapAppleMetadataToAppInfoLocalizationPayload(
  document: AppleMetadataDocument,
  localizationId: string,
): AppleAppInfoLocalizationPayload {
  return {
    data: {
      id: localizationId,
      type: "appInfoLocalizations",
      attributes: {
        locale: document.locale,
        name: document.app_name,
        subtitle: document.subtitle,
        privacyPolicyUrl: document.privacy_policy_url,
      },
    },
  };
}

async function listAppleAppInfoLocalizations(
  client: AppStoreConnectClient,
  appInfoId: string,
): Promise<AppleAppInfoLocalizationData[]> {
  return requestAllAppStoreConnectPages<AppleAppInfoLocalizationData>(
    client,
    `/appInfos/${encodeURIComponent(appInfoId)}/appInfoLocalizations`,
  );
}

export interface AppleUpdatedAppInfoLocalizationResult {
  locale: string;
  localizationId: string;
}

export async function updateExistingAppleAppInfoLocalizations(
  client: AppStoreConnectClient,
  appInfoId: string,
  documents: AppleMetadataDocument[],
): Promise<AppleUpdatedAppInfoLocalizationResult[]> {
  const localizations = await listAppleAppInfoLocalizations(client, appInfoId);
  const localizationsByLocale = new Map(
    localizations
      .filter((localization) => localization.id !== undefined)
      .map((localization) => [localization.attributes.locale, localization] as const),
  );
  const results: AppleUpdatedAppInfoLocalizationResult[] = [];

  for (const document of documents) {
    const localization = localizationsByLocale.get(document.locale);

    if (localization?.id === undefined) {
      continue;
    }

    await patchAppStoreConnectJson(
      client,
      `/appInfoLocalizations/${encodeURIComponent(localization.id)}`,
      mapAppleMetadataToAppInfoLocalizationPayload(document, localization.id),
    );
    results.push({
      locale: document.locale,
      localizationId: localization.id,
    });
  }

  return results.sort((left, right) => left.locale.localeCompare(right.locale));
}
