import type { AppStoreConnectClient } from "../client.js";
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
