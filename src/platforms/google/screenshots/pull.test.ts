import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { GooglePlayClient } from "../client.js";
import {
  downloadGoogleImage,
  downloadGoogleScreenshotSet,
  expandGoogleScreenshotPullLocales,
  listGoogleImagesForLocaleAndType,
  listGoogleImagesForLocalesAndTypes,
} from "./pull.js";

describe("listGoogleImagesForLocaleAndType", () => {
  it("requests the Google Play images list endpoint for one locale and image type", async () => {
    const requestJson = vi.fn().mockResolvedValue({
      images: [{ id: "image-1", url: "https://example.com/1.png" }],
    });
    const client = { requestJson } as unknown as GooglePlayClient;

    await expect(
      listGoogleImagesForLocaleAndType(
        client,
        "com.example.app",
        "edit-123",
        "en_us",
        "phoneScreenshots",
      ),
    ).resolves.toEqual({
      locale: "en-US",
      imageType: "phoneScreenshots",
      images: [{ id: "image-1", url: "https://example.com/1.png" }],
    });

    expect(requestJson).toHaveBeenCalledWith(
      "/applications/com.example.app/edits/edit-123/listings/en_us/phoneScreenshots",
    );
  });

  it("normalizes missing image arrays to empty arrays", async () => {
    const requestJson = vi.fn().mockResolvedValue({});
    const client = { requestJson } as unknown as GooglePlayClient;

    await expect(
      listGoogleImagesForLocaleAndType(
        client,
        "com.example.app",
        "edit-123",
        "tr-tr",
        "sevenInchScreenshots",
      ),
    ).resolves.toEqual({
      locale: "tr-TR",
      imageType: "sevenInchScreenshots",
      images: [],
    });
  });
});

describe("listGoogleImagesForLocalesAndTypes", () => {
  it("requests every locale and image type combination", async () => {
    const requestJson = vi.fn().mockResolvedValue({ images: [] });
    const client = { requestJson } as unknown as GooglePlayClient;

    const result = await listGoogleImagesForLocalesAndTypes(
      client,
      "com.example.app",
      "edit-123",
      ["en-US", "tr-TR"],
      ["phoneScreenshots", "wearScreenshots"],
    );

    expect(result).toHaveLength(4);
    expect(requestJson).toHaveBeenCalledTimes(4);
  });
});

describe("downloadGoogleImage", () => {
  it("downloads the remote screenshot and infers the extension from content type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("png-data").buffer,
        headers: new Headers({
          "content-type": "image/png",
        }),
      }),
    );

    await expect(
      downloadGoogleImage({
        url: "https://example.com/screenshot",
      }),
    ).resolves.toEqual({
      buffer: new Uint8Array(new TextEncoder().encode("png-data")),
      extension: "png",
    });

    vi.unstubAllGlobals();
  });
});

describe("expandGoogleScreenshotPullLocales", () => {
  it("adds grouped locales when one locale in the group is already targeted", () => {
    expect(
      expandGoogleScreenshotPullLocales(["tr-TR", "en_us"], {
        groups: {
          english: {
            locales: ["en-US", "en-GB", "en-AU"],
          },
          spanish: {
            locales: ["es-ES", "es-419"],
          },
        },
      }),
    ).toEqual(["tr-TR", "en-US", "en-GB", "en-AU"]);
  });

  it("keeps locales unique after normalization and group expansion", () => {
    expect(
      expandGoogleScreenshotPullLocales(["en-US", "en_us"], {
        groups: {
          english: {
            locales: ["en-US", "en-GB"],
          },
        },
      }),
    ).toEqual(["en-US", "en-GB"]);
  });
});

describe("downloadGoogleScreenshotSet", () => {
  it("writes screenshots into the canonical google locale and asset-type layout", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("image-data").buffer,
        headers: new Headers({
          "content-type": "image/png",
        }),
      }),
    );

    try {
      const result = await downloadGoogleScreenshotSet(screenshotsBaseDir, {
        locale: "en_us",
        imageType: "phoneScreenshots",
        images: [
          {
            url: "https://example.com/one",
          },
        ],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.fileName).toBe("1.png");
      expect(result.files[0]?.filePath).toBe(
        join(
          screenshotsBaseDir,
          "google",
          "en-US",
          "phoneScreenshots",
          "1.png",
        ),
      );
      await expect(readFile(result.files[0]!.filePath, "utf8")).resolves.toBe(
        "image-data",
      );
    } finally {
      vi.unstubAllGlobals();
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });
});
