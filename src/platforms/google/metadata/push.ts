import { resolve } from "node:path";

import type { MetadataFormat } from "../../../config/types.js";
import type { GoogleMetadataDocument } from "../../../formats/metadata-types.js";
import {
  listMetadataFilesForFormat,
  loadMetadataFileForFormat,
} from "../../../formats/metadata-files.js";
import {
  validateGoogleMetadataDocument,
  validateGoogleMetadataLengthConstraints,
} from "../../../validation/metadata/google.js";
import { GooglePlayClient } from "../client.js";
import type { GoogleStoreListingUpdate } from "./types.js";

async function loadGoogleMetadataFile(
  filePath: string,
  format: MetadataFormat,
): Promise<GoogleMetadataDocument> {
  return validateGoogleMetadataDocument(
    (await loadMetadataFileForFormat(filePath, "google", format)).parsed,
  );
}

export async function loadGoogleMetadataDocuments(
  metadataBaseDir: string,
  format: MetadataFormat = "yaml",
): Promise<GoogleMetadataDocument[]> {
  const googleMetadataDir = resolve(metadataBaseDir, "google");
  const documents: GoogleMetadataDocument[] = [];

  for (const filePath of await listMetadataFilesForFormat(googleMetadataDir, format)) {
    const document = await loadGoogleMetadataFile(filePath, format);

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
