import { GooglePlayClient } from "../client.js";
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
