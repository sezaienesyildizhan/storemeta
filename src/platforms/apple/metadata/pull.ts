import type { AppStoreConnectClient } from "../client.js";
import { requestAllAppStoreConnectPages } from "../client.js";
import type { AppleAppInfoLocalizationData } from "./types.js";

interface AppleAppInfoData {
  id: string;
  type: "appInfos";
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
