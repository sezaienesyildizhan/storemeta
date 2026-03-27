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
