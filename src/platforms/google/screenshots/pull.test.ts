import { describe, expect, it, vi } from "vitest";

import type { GooglePlayClient } from "../client.js";
import {
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
