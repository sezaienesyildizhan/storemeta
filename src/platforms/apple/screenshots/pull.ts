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
