import { describe, expect, it } from "vitest";

import { normalizeGoogleListing } from "./pull.js";
import {
  mapGoogleMetadataDocument,
  mapGoogleMetadataDocuments,
} from "./push.js";

describe("normalizeGoogleListing", () => {
  it("maps a Google Play listing into the local metadata schema", () => {
    expect(
      normalizeGoogleListing({
        language: "en_us",
        title: "Storemeta Example",
        shortDescription: "Short summary",
        fullDescription: "Longer description",
        video: "https://example.com/video",
      }),
    ).toEqual({
      locale: "en-US",
      title: "Storemeta Example",
      short_description: "Short summary",
      full_description: "Longer description",
      video: "https://example.com/video",
    });
  });
});

describe("mapGoogleMetadataDocument", () => {
  it("maps one local Google metadata document into a listing update", () => {
    expect(
      mapGoogleMetadataDocument({
        locale: "tr",
        title: "Storemeta Ornek",
        short_description: "Kisa aciklama",
        full_description: "Uzun aciklama",
        video: "https://example.com/video",
      }),
    ).toEqual({
      language: "tr",
      body: {
        title: "Storemeta Ornek",
        shortDescription: "Kisa aciklama",
        fullDescription: "Uzun aciklama",
        video: "https://example.com/video",
      },
    });
  });
});

describe("mapGoogleMetadataDocuments", () => {
  it("maps multiple Google metadata documents in order", () => {
    expect(
      mapGoogleMetadataDocuments([
        {
          locale: "en-US",
          title: "English",
        },
        {
          locale: "tr",
          title: "Turkce",
        },
      ]),
    ).toEqual([
      {
        language: "en-US",
        body: {
          title: "English",
          shortDescription: undefined,
          fullDescription: undefined,
          video: undefined,
        },
      },
      {
        language: "tr",
        body: {
          title: "Turkce",
          shortDescription: undefined,
          fullDescription: undefined,
          video: undefined,
        },
      },
    ]);
  });
});
