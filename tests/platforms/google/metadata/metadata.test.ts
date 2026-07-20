import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { GooglePlayClient } from "../../../../src/platforms/google/client.js";
import {
  fetchGoogleListingForLocale,
  fetchGoogleListingsForLocales,
  normalizeGoogleListing,
  writeGoogleListingDocument,
  writeGoogleListingDocuments,
} from "../../../../src/platforms/google/metadata/pull.js";
import {
  loadGoogleMetadataDocuments,
  mapGoogleMetadataDocument,
  mapGoogleMetadataDocuments,
  uploadGoogleListing,
  uploadGoogleListings,
} from "../../../../src/platforms/google/metadata/push.js";

function createClientMock() {
  return {
    request: vi.fn(),
    requestJson: vi.fn(),
  } as unknown as GooglePlayClient & {
    request: ReturnType<typeof vi.fn>;
    requestJson: ReturnType<typeof vi.fn>;
  };
}

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

describe("Google listing pull helpers", () => {
  it("fetches one listing with encoded package, edit, and locale", async () => {
    const client = createClientMock();
    client.requestJson.mockResolvedValueOnce({
      language: "en-US",
      title: "Example",
    });

    await expect(
      fetchGoogleListingForLocale(client, "com.example app", "edit 1", "en-US"),
    ).resolves.toEqual({
      language: "en-US",
      title: "Example",
    });
    expect(client.requestJson).toHaveBeenCalledWith(
      "/applications/com.example%20app/edits/edit%201/listings/en-US",
    );
  });

  it("fetches multiple listings in locale order", async () => {
    const client = createClientMock();
    client.requestJson
      .mockResolvedValueOnce({ language: "en-US", title: "English" })
      .mockResolvedValueOnce({ language: "tr-TR", title: "Turkce" });

    await expect(
      fetchGoogleListingsForLocales(client, "com.example.app", "edit-1", [
        "en-US",
        "tr-TR",
      ]),
    ).resolves.toEqual([
      { language: "en-US", title: "English" },
      { language: "tr-TR", title: "Turkce" },
    ]);
  });

  it("writes Google listing documents to normalized YAML paths", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-google-"));

    try {
      await expect(
        writeGoogleListingDocument(metadataBaseDir, {
          locale: "en_US",
          title: "English",
        }),
      ).resolves.toBe(join(metadataBaseDir, "google", "en-US.yml"));
      await expect(
        writeGoogleListingDocuments(metadataBaseDir, [
          {
            locale: "tr_TR",
            title: "Turkce",
          },
        ]),
      ).resolves.toEqual([join(metadataBaseDir, "google", "tr-TR.yml")]);
      await expect(
        readFile(join(metadataBaseDir, "google", "en-US.yml"), "utf8"),
      ).resolves.toContain("title: English");
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
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

describe("Google listing push helpers", () => {
  it("loads Google metadata documents from supported files in sorted order", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-google-"));
    const googleDir = join(metadataBaseDir, "google");

    try {
      await mkdir(googleDir, { recursive: true });
      await mkdir(join(googleDir, "nested"));
      await writeFile(join(googleDir, "tr.yml"), "locale: tr\ntitle: Turkce\n");
      await writeFile(
        join(googleDir, "en-US.yaml"),
        "locale: en-US\ntitle: English\n",
      );
      await writeFile(join(googleDir, "notes.txt"), "ignored\n");

      await expect(loadGoogleMetadataDocuments(metadataBaseDir)).resolves.toEqual([
        {
          locale: "en-US",
          title: "English",
        },
        {
          locale: "tr",
          title: "Turkce",
        },
      ]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });

  it("fails when the Google metadata directory is missing", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-google-"));

    try {
      await expect(loadGoogleMetadataDocuments(metadataBaseDir)).rejects.toThrow(
        /Failed to read local Google metadata directory/,
      );
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });

  it("uploads one listing with encoded path and JSON body", async () => {
    const client = createClientMock();
    client.request.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      uploadGoogleListing(client, "com.example app", "edit 1", {
        language: "en-US",
        body: {
          title: "Example",
          shortDescription: "Short",
        },
      }),
    ).resolves.toBeUndefined();
    expect(client.request).toHaveBeenCalledWith(
      "/applications/com.example%20app/edits/edit%201/listings/en-US",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: "en-US",
          title: "Example",
          shortDescription: "Short",
        }),
      },
    );
  });

  it("uploads multiple listings and calls onUploaded per update", async () => {
    const client = createClientMock();
    client.request.mockResolvedValue(new Response(null, { status: 204 }));
    const onUploaded = vi.fn();
    const updates = [
      {
        language: "en-US",
        body: {
          title: "English",
        },
      },
      {
        language: "tr",
        body: {
          title: "Turkce",
        },
      },
    ];

    await expect(
      uploadGoogleListings(client, "com.example.app", "edit-1", updates, {
        onUploaded,
      }),
    ).resolves.toBeUndefined();
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(onUploaded).toHaveBeenNthCalledWith(1, updates[0]);
    expect(onUploaded).toHaveBeenNthCalledWith(2, updates[1]);
  });
});
