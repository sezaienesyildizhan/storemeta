import { normalizeLocaleCode } from "../../../locales/normalize.js";
import { GooglePlayClient } from "../client.js";
import type {
  GooglePlayImageListResponse,
  GoogleScreenshotImageType,
  GoogleScreenshotSet,
} from "./types.js";

export async function listGoogleImagesForLocaleAndType(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locale: string,
  imageType: GoogleScreenshotImageType,
): Promise<GoogleScreenshotSet> {
  const response = await client.requestJson<GooglePlayImageListResponse>(
    `/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale)}/${encodeURIComponent(imageType)}`,
  );

  return {
    locale: normalizeLocaleCode(locale),
    imageType,
    images: response.images ?? [],
  };
}

export async function listGoogleImagesForLocalesAndTypes(
  client: GooglePlayClient,
  packageName: string,
  editId: string,
  locales: string[],
  imageTypes: GoogleScreenshotImageType[],
): Promise<GoogleScreenshotSet[]> {
  return Promise.all(
    locales.flatMap((locale) =>
      imageTypes.map((imageType) =>
        listGoogleImagesForLocaleAndType(
          client,
          packageName,
          editId,
          locale,
          imageType,
        ),
      ),
    ),
  );
}
