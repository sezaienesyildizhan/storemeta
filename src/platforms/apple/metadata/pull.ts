import type { AppleMetadataDocument } from "../../../formats/metadata-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import type { AppStoreConnectClient } from "../client.js";
import { requestAllAppStoreConnectPages } from "../client.js";
import type {
  AppleAppInfoLocalizationData,
  AppleAppStoreVersionLocalizationData,
} from "./types.js";

interface AppleAppInfoData {
  id: string;
  type: "appInfos";
}

type ApplePlatform = "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";

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

interface AppleAppStoreVersionAttributes {
  platform?: ApplePlatform;
  appStoreState?: AppleAppStoreState;
  createdDate?: string;
  versionString?: string;
}

interface AppleAppStoreVersionData {
  id: string;
  type: "appStoreVersions";
  attributes?: AppleAppStoreVersionAttributes;
}

const EDITABLE_APP_STORE_STATES: AppleAppStoreState[] = [
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
];

function getAppleVersionCreatedTimestamp(version: AppleAppStoreVersionData): number {
  const createdDate = version.attributes?.createdDate;

  if (createdDate === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(createdDate);

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function sortAppleVersionsByPriority(
  versions: AppleAppStoreVersionData[],
): AppleAppStoreVersionData[] {
  return [...versions].sort((left, right) => {
    const createdDateOrder =
      getAppleVersionCreatedTimestamp(right) - getAppleVersionCreatedTimestamp(left);

    if (createdDateOrder !== 0) {
      return createdDateOrder;
    }

    return right.id.localeCompare(left.id);
  });
}

export function selectPreferredAppleAppStoreVersion(
  versions: AppleAppStoreVersionData[],
): AppleAppStoreVersionData | undefined {
  const sortedVersions = sortAppleVersionsByPriority(versions);
  const iosVersions = sortedVersions.filter(
    (version) => version.attributes?.platform === "IOS",
  );
  const candidateVersions = iosVersions.length > 0 ? iosVersions : sortedVersions;
  const editableVersion = candidateVersions.find((version) => {
    const state = version.attributes?.appStoreState;

    return state !== undefined && EDITABLE_APP_STORE_STATES.includes(state);
  });

  if (editableVersion !== undefined) {
    return editableVersion;
  }

  const liveVersion = candidateVersions.find(
    (version) => version.attributes?.appStoreState === "READY_FOR_SALE",
  );

  if (liveVersion !== undefined) {
    return liveVersion;
  }

  return candidateVersions[0];
}

export async function fetchAppleAppInfoLocalizations(
  client: AppStoreConnectClient,
  appId: string,
): Promise<AppleAppInfoLocalizationData[]> {
  const appInfos = await requestAllAppStoreConnectPages<AppleAppInfoData>(
    client,
    `/apps/${encodeURIComponent(appId)}/appInfos`,
  );

  if (appInfos.length === 0) {
    return [];
  }

  return requestAllAppStoreConnectPages<AppleAppInfoLocalizationData>(
    client,
    `/appInfos/${encodeURIComponent(appInfos[0]!.id)}/appInfoLocalizations`,
  );
}

export async function fetchAppleAppStoreVersionLocalizations(
  client: AppStoreConnectClient,
  appId: string,
): Promise<AppleAppStoreVersionLocalizationData[]> {
  const appStoreVersions = await requestAllAppStoreConnectPages<AppleAppStoreVersionData>(
    client,
    `/apps/${encodeURIComponent(appId)}/appStoreVersions`,
  );
  const selectedVersion = selectPreferredAppleAppStoreVersion(appStoreVersions);

  if (selectedVersion === undefined) {
    return [];
  }

  return requestAllAppStoreConnectPages<AppleAppStoreVersionLocalizationData>(
    client,
    `/appStoreVersions/${encodeURIComponent(selectedVersion.id)}/appStoreVersionLocalizations`,
  );
}

export interface MergedAppleLocalization {
  locale: string;
  appInfoLocalization?: AppleAppInfoLocalizationData;
  appStoreVersionLocalization?: AppleAppStoreVersionLocalizationData;
}

export function mergeAppleLocalizations(
  appInfoLocalizations: AppleAppInfoLocalizationData[],
  appStoreVersionLocalizations: AppleAppStoreVersionLocalizationData[],
): MergedAppleLocalization[] {
  const mergedLocalizations = new Map<string, MergedAppleLocalization>();

  for (const localization of appInfoLocalizations) {
    const locale = localization.attributes.locale;

    if (locale === undefined || locale.trim().length === 0) {
      continue;
    }

    mergedLocalizations.set(locale, {
      locale,
      ...mergedLocalizations.get(locale),
      appInfoLocalization: localization,
    });
  }

  for (const localization of appStoreVersionLocalizations) {
    const locale = localization.attributes.locale;

    if (locale === undefined || locale.trim().length === 0) {
      continue;
    }

    mergedLocalizations.set(locale, {
      locale,
      ...mergedLocalizations.get(locale),
      appStoreVersionLocalization: localization,
    });
  }

  return [...mergedLocalizations.values()].sort((left, right) =>
    left.locale.localeCompare(right.locale),
  );
}

export function normalizeMergedAppleLocalization(
  localization: MergedAppleLocalization,
): AppleMetadataDocument {
  const appInfoAttributes = localization.appInfoLocalization?.attributes;
  const versionAttributes = localization.appStoreVersionLocalization?.attributes;

  return {
    locale: normalizeLocaleCode(localization.locale),
    app_name: appInfoAttributes?.name,
    subtitle: appInfoAttributes?.subtitle,
    privacy_policy_url: appInfoAttributes?.privacyPolicyUrl,
    description: versionAttributes?.description,
    keywords: versionAttributes?.keywords,
    marketing_url: versionAttributes?.marketingUrl,
    promotional_text: versionAttributes?.promotionalText,
    support_url: versionAttributes?.supportUrl,
    whats_new: versionAttributes?.whatsNew,
  };
}

export function normalizeMergedAppleLocalizations(
  localizations: MergedAppleLocalization[],
): AppleMetadataDocument[] {
  return localizations.map(normalizeMergedAppleLocalization);
}
