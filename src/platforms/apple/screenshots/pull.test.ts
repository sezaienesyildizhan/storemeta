import { describe, expect, it, vi } from "vitest";

import { fetchAppleScreenshotLocalizations } from "./pull.js";
import type { AppStoreConnectClient } from "../client.js";

const { fetchAppleAppStoreVersionLocalizationsMock } = vi.hoisted(() => ({
  fetchAppleAppStoreVersionLocalizationsMock: vi.fn(),
}));

vi.mock("../metadata/pull.js", async () => {
  const actual = await vi.importActual("../metadata/pull.js");

  return {
    ...actual,
    fetchAppleAppStoreVersionLocalizations:
      fetchAppleAppStoreVersionLocalizationsMock,
  };
});

describe("fetchAppleScreenshotLocalizations", () => {
  it("reuses the preferred Apple app store version localization fetcher", async () => {
    fetchAppleAppStoreVersionLocalizationsMock.mockResolvedValueOnce([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleScreenshotLocalizations(client, "1234567890"),
    ).resolves.toEqual([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);

    expect(fetchAppleAppStoreVersionLocalizationsMock).toHaveBeenCalledWith(
      client,
      "1234567890",
    );
  });
});
