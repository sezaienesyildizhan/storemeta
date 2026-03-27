import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { StoremetaError } from "../../../cli/errors.js";
import type { GoogleMetadataDocument } from "../../../formats/metadata-types.js";
import {
  loadMarkdownMetadataFile,
  loadYamlMetadataFile,
  loadYmlMetadataFile,
} from "../../../formats/load-metadata.js";
import {
  validateGoogleMetadataDocument,
  validateGoogleMetadataLengthConstraints,
} from "../../../validation/metadata/google.js";
import { GooglePlayClient } from "../client.js";
import type { GoogleStoreListingUpdate } from "./types.js";

async function loadGoogleMetadataFile(
  filePath: string,
): Promise<GoogleMetadataDocument | undefined> {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".yml") {
    return validateGoogleMetadataDocument(
      (await loadYmlMetadataFile(filePath)).parsed,
    );
  }

  if (extension === ".yaml") {
    return validateGoogleMetadataDocument(
      (await loadYamlMetadataFile(filePath)).parsed,
    );
  }

  if (extension === ".md") {
    return validateGoogleMetadataDocument(
      (await loadMarkdownMetadataFile(filePath)).parsed,
    );
  }

  return undefined;
}

export async function loadGoogleMetadataDocuments(
  metadataBaseDir: string,
): Promise<GoogleMetadataDocument[]> {
  const googleMetadataDir = resolve(metadataBaseDir, "google");
  let entries;

  try {
    entries = await readdir(googleMetadataDir, { withFileTypes: true });
  } catch (cause) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read local Google metadata directory at ${googleMetadataDir}`,
      { cause },
    );
  }

  const documents: GoogleMetadataDocument[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile()) {
      continue;
    }

    const document = await loadGoogleMetadataFile(
      join(googleMetadataDir, entry.name),
    );

    if (document === undefined) {
      continue;
    }

    validateGoogleMetadataLengthConstraints(document);
    documents.push(document);
  }

  return documents;
}

export function mapGoogleMetadataDocument(
  document: GoogleMetadataDocument,
): GoogleStoreListingUpdate {
  return {
    language: document.locale,
    body: {
      title: document.title,
      shortDescription: document.short_description,
      fullDescription: document.full_description,
      video: document.video,
    },
  };
}

export function mapGoogleMetadataDocuments(
  documents: GoogleMetadataDocument[],
): GoogleStoreListingUpdate[] {
  return documents.map(mapGoogleMetadataDocument);
}

export async function uploadGoogleListing(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  update: GoogleStoreListingUpdate,
): Promise<void> {
  await client.request(
    `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(update.language)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: update.language,
        ...update.body,
      }),
    },
  );
}

export async function uploadGoogleListings(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  updates: GoogleStoreListingUpdate[],
  options?: {
    onUploaded?: (update: GoogleStoreListingUpdate) => void;
  },
): Promise<void> {
  for (const update of updates) {
    await uploadGoogleListing(client, packageName, editId, update);
    options?.onUploaded?.(update);
  }
}
