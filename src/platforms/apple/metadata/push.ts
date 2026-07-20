import { resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type { MetadataFormat } from "../../../config/types.js";
import type { AppleMetadataDocument } from "../../../formats/metadata-types.js";
import {
  listMetadataFilesForFormat,
  loadMetadataFileForFormat,
} from "../../../formats/metadata-files.js";
import type { AppStoreConnectClient } from "../client.js";
import {
  patchAppStoreConnectJson,
  postAppStoreConnectJson,
  requestAllAppStoreConnectPages,
} from "../client.js";
import type {
  AppleAppInfoLocalizationData,
  AppleAppInfoLocalizationPayload,
  AppleAppStoreVersionLocalizationData,
  AppleAppStoreVersionLocalizationPayload,
} from "./types.js";
import { validateAppleMetadataDocument } from "../../../validation/metadata/apple.js";

async function loadAppleMetadataDocument(
  filePath: string,
  format: MetadataFormat,
): Promise<AppleMetadataDocument> {
  return validateAppleMetadataDocument(
    (await loadMetadataFileForFormat(filePath, "apple", format)).parsed,
  );
}

export async function loadAppleMetadataDocuments(
  metadataBaseDir: string,
  format: MetadataFormat = "yaml",
): Promise<AppleMetadataDocument[]> {
  const documents: AppleMetadataDocument[] = [];
  const appleMetadataDirectory = resolve(metadataBaseDir, "apple");

  for (const filePath of await listMetadataFilesForFormat(
    appleMetadataDirectory,
    format,
    { allowMissing: true },
  )) {
    documents.push(await loadAppleMetadataDocument(filePath, format));
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

interface AppleAppInfoLocalizationCreatePayload {
  data: {
    type: "appInfoLocalizations";
    attributes: {
      locale: string;
      name?: string;
      subtitle?: string;
      privacyPolicyUrl?: string;
    };
    relationships: {
      appInfo: {
        data: {
          type: "appInfos";
          id: string;
        };
      };
    };
  };
}

function mapAppleMetadataToAppInfoLocalizationCreatePayload(
  document: AppleMetadataDocument,
  appInfoId: string,
): AppleAppInfoLocalizationCreatePayload {
  return {
    data: {
      type: "appInfoLocalizations",
      attributes: {
        locale: document.locale,
        name: document.app_name,
        subtitle: document.subtitle,
        privacyPolicyUrl: document.privacy_policy_url,
      },
      relationships: {
        appInfo: {
          data: {
            type: "appInfos",
            id: appInfoId,
          },
        },
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

export interface AppleCreatedAppInfoLocalizationResult {
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

export async function createMissingAppleAppInfoLocalizations(
  client: AppStoreConnectClient,
  appInfoId: string,
  documents: AppleMetadataDocument[],
): Promise<AppleCreatedAppInfoLocalizationResult[]> {
  const localizations = await listAppleAppInfoLocalizations(client, appInfoId);
  const existingLocales = new Set(
    localizations
      .map((localization) => localization.attributes.locale)
      .filter((locale): locale is string => locale !== undefined),
  );
  const results: AppleCreatedAppInfoLocalizationResult[] = [];

  for (const document of documents) {
    if (existingLocales.has(document.locale)) {
      continue;
    }

    const response = await postAppStoreConnectJson<AppleAppInfoLocalizationPayload>(
      client,
      "/appInfoLocalizations",
      mapAppleMetadataToAppInfoLocalizationCreatePayload(document, appInfoId),
    );

    if (response.data.id === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect did not return an app info localization id for locale ${document.locale}`,
      );
    }

    results.push({
      locale: document.locale,
      localizationId: response.data.id,
    });
    existingLocales.add(document.locale);
  }

  return results.sort((left, right) => left.locale.localeCompare(right.locale));
}

function mapAppleMetadataToAppStoreVersionLocalizationPayload(
  document: AppleMetadataDocument,
  localizationId: string,
): AppleAppStoreVersionLocalizationPayload {
  return {
    data: {
      id: localizationId,
      type: "appStoreVersionLocalizations",
      attributes: {
        locale: document.locale,
        description: document.description,
        keywords: document.keywords,
        marketingUrl: document.marketing_url,
        promotionalText: document.promotional_text,
        supportUrl: document.support_url,
        whatsNew: document.whats_new,
      },
    },
  };
}

interface AppleAppStoreVersionLocalizationCreatePayload {
  data: {
    type: "appStoreVersionLocalizations";
    attributes: {
      locale: string;
      description?: string;
      keywords?: string;
      marketingUrl?: string;
      promotionalText?: string;
      supportUrl?: string;
      whatsNew?: string;
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

function mapAppleMetadataToAppStoreVersionLocalizationCreatePayload(
  document: AppleMetadataDocument,
  appStoreVersionId: string,
): AppleAppStoreVersionLocalizationCreatePayload {
  return {
    data: {
      type: "appStoreVersionLocalizations",
      attributes: {
        locale: document.locale,
        description: document.description,
        keywords: document.keywords,
        marketingUrl: document.marketing_url,
        promotionalText: document.promotional_text,
        supportUrl: document.support_url,
        whatsNew: document.whats_new,
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

export interface AppleUpdatedAppStoreVersionLocalizationResult {
  locale: string;
  localizationId: string;
}

export interface AppleCreatedAppStoreVersionLocalizationResult {
  locale: string;
  localizationId: string;
}

export async function updateExistingAppleAppStoreVersionLocalizations(
  client: AppStoreConnectClient,
  appStoreVersionId: string,
  documents: AppleMetadataDocument[],
): Promise<AppleUpdatedAppStoreVersionLocalizationResult[]> {
  const localizations = await listAppleAppStoreVersionLocalizations(
    client,
    appStoreVersionId,
  );
  const localizationsByLocale = new Map(
    localizations
      .filter((localization) => localization.id !== undefined)
      .map((localization) => [localization.attributes.locale, localization] as const),
  );
  const results: AppleUpdatedAppStoreVersionLocalizationResult[] = [];

  for (const document of documents) {
    const localization = localizationsByLocale.get(document.locale);

    if (localization?.id === undefined) {
      continue;
    }

    await patchAppStoreConnectJson(
      client,
      `/appStoreVersionLocalizations/${encodeURIComponent(localization.id)}`,
      mapAppleMetadataToAppStoreVersionLocalizationPayload(
        document,
        localization.id,
      ),
    );
    results.push({
      locale: document.locale,
      localizationId: localization.id,
    });
  }

  return results.sort((left, right) => left.locale.localeCompare(right.locale));
}

export async function createMissingAppleAppStoreVersionLocalizations(
  client: AppStoreConnectClient,
  appStoreVersionId: string,
  documents: AppleMetadataDocument[],
): Promise<AppleCreatedAppStoreVersionLocalizationResult[]> {
  const localizations = await listAppleAppStoreVersionLocalizations(
    client,
    appStoreVersionId,
  );
  const existingLocales = new Set(
    localizations
      .map((localization) => localization.attributes.locale)
      .filter((locale): locale is string => locale !== undefined),
  );
  const results: AppleCreatedAppStoreVersionLocalizationResult[] = [];

  for (const document of documents) {
    if (existingLocales.has(document.locale)) {
      continue;
    }

    const response =
      await postAppStoreConnectJson<AppleAppStoreVersionLocalizationPayload>(
        client,
        "/appStoreVersionLocalizations",
        mapAppleMetadataToAppStoreVersionLocalizationCreatePayload(
          document,
          appStoreVersionId,
        ),
      );

    if (response.data.id === undefined) {
      throw new StoremetaError(
        "API_ERROR",
        `App Store Connect did not return an app store version localization id for locale ${document.locale}`,
      );
    }

    results.push({
      locale: document.locale,
      localizationId: response.data.id,
    });
    existingLocales.add(document.locale);
  }

  return results.sort((left, right) => left.locale.localeCompare(right.locale));
}
