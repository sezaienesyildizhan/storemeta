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
import { requestAllAppStoreConnectPages } from "../client.js";
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
