import { GooglePlayClient } from "../client.js";
import type { MetadataFormat } from "../../../config/types.js";
import { metadataFileName } from "../../../formats/metadata-files.js";
import type { GoogleMetadataDocument } from "../../../formats/metadata-types.js";
import { normalizeLocaleCode } from "../../../locales/normalize.js";
import { writeMetadataFile } from "../../../writers/write-metadata.js";
import type { GoogleStoreListing } from "./types.js";

export interface GoogleStoreListingResource extends GoogleStoreListing {
  language: string;
}

export async function fetchGoogleListingForLocale(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locale: string,
): Promise<GoogleStoreListingResource> {
  return client.requestJson<GoogleStoreListingResource>(
    `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale)}`,
  );
}

export async function fetchGoogleListingsForLocales(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locales: string[],
): Promise<GoogleStoreListingResource[]> {
  return Promise.all(
    locales.map((locale) =>
      fetchGoogleListingForLocale(client, packageName, editId, locale),
    ),
  );
}

export function normalizeGoogleListing(
  listing: GoogleStoreListingResource,
): GoogleMetadataDocument {
  return {
    locale: normalizeLocaleCode(listing.language),
    title: listing.title,
    short_description: listing.shortDescription,
    full_description: listing.fullDescription,
    video: listing.video,
  };
}

export async function writeGoogleListingDocument(
  metadataBaseDir: string,
  document: GoogleMetadataDocument,
  format: MetadataFormat = "yaml",
  fetchedAt?: string,
): Promise<string> {
  const normalizedLocale = normalizeLocaleCode(document.locale);

  return writeMetadataFile(
    metadataBaseDir,
    `google/${metadataFileName(normalizedLocale, format)}`,
    { ...document, locale: normalizedLocale },
    {
      format,
      platform: "google",
      markdown: {
        frontmatter: {
          platform: "google",
          source: "pulled",
          fetchedAt,
        },
      },
    },
  );
}

export async function writeGoogleListingDocuments(
  metadataBaseDir: string,
  documents: GoogleMetadataDocument[],
  format: MetadataFormat = "yaml",
  fetchedAt?: string,
): Promise<string[]> {
  return Promise.all(
    documents.map((document) =>
      writeGoogleListingDocument(metadataBaseDir, document, format, fetchedAt),
    ),
  );
}
