import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  downloadAppleScreenshot,
  downloadAppleScreenshotSet,
  fetchAppleScreenshotLocalizations,
  fetchAppleScreenshotsForSets,
  fetchAppleScreenshotSetsForLocalizations,
} from "./pull.js";
import type { AppStoreConnectClient } from "../client.js";

const {
  fetchAppleAppStoreVersionLocalizationsMock,
  requestAllAppStoreConnectPagesMock,
} = vi.hoisted(() => ({
  fetchAppleAppStoreVersionLocalizationsMock: vi.fn(),
  requestAllAppStoreConnectPagesMock: vi.fn(),
}));

vi.mock("../client.js", async () => {
  const actual = await vi.importActual("../client.js");

  return {
    ...actual,
    requestAllAppStoreConnectPages: requestAllAppStoreConnectPagesMock,
  };
});

vi.mock("../metadata/pull.js", async () => {
  const actual = await vi.importActual("../metadata/pull.js");

  return {
    ...actual,
    fetchAppleAppStoreVersionLocalizations:
      fetchAppleAppStoreVersionLocalizationsMock,
  };
});

beforeEach(() => {
  fetchAppleAppStoreVersionLocalizationsMock.mockReset();
  requestAllAppStoreConnectPagesMock.mockReset();
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

describe("fetchAppleScreenshotSetsForLocalizations", () => {
  it("fetches screenshot sets for each Apple version localization", async () => {
    requestAllAppStoreConnectPagesMock
      .mockResolvedValueOnce([
        {
          id: "screenshot-set-en",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "screenshot-set-tr",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
      ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleScreenshotSetsForLocalizations(client, [
        {
          id: "version-loc-tr",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "tr",
          },
        },
        {
          id: "version-loc-en",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "en-US",
          },
        },
      ]),
    ).resolves.toEqual([
      {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSets: [
          {
            id: "screenshot-set-tr",
            type: "appScreenshotSets",
            attributes: {
              screenshotDisplayType: "APP_IPHONE_65",
            },
          },
        ],
      },
      {
        localizationId: "version-loc-tr",
        locale: "tr",
        screenshotSets: [
          {
            id: "screenshot-set-en",
            type: "appScreenshotSets",
            attributes: {
              screenshotDisplayType: "APP_IPHONE_65",
            },
          },
        ],
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      1,
      client,
      "/appStoreVersionLocalizations/version-loc-tr/appScreenshotSets",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      2,
      client,
      "/appStoreVersionLocalizations/version-loc-en/appScreenshotSets",
    );
  });
});

describe("fetchAppleScreenshotsForSets", () => {
  it("fetches screenshots for each Apple screenshot set", async () => {
    requestAllAppStoreConnectPagesMock
      .mockResolvedValueOnce([
        {
          id: "screenshot-en-1",
          type: "appScreenshots",
          attributes: {
            fileName: "en-1.png",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "screenshot-tr-1",
          type: "appScreenshots",
          attributes: {
            fileName: "tr-1.png",
          },
        },
      ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleScreenshotsForSets(client, [
        {
          localizationId: "version-loc-tr",
          locale: "tr",
          screenshotSets: [
            {
              id: "set-tr",
              type: "appScreenshotSets",
              attributes: {
                screenshotDisplayType: "APP_IPHONE_65",
              },
            },
          ],
        },
        {
          localizationId: "version-loc-en",
          locale: "en-US",
          screenshotSets: [
            {
              id: "set-en",
              type: "appScreenshotSets",
              attributes: {
                screenshotDisplayType: "APP_IPHONE_65",
              },
            },
          ],
        },
      ]),
    ).resolves.toEqual([
      {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSet: {
          id: "set-en",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
        screenshots: [
          {
            id: "screenshot-tr-1",
            type: "appScreenshots",
            attributes: {
              fileName: "tr-1.png",
            },
          },
        ],
      },
      {
        localizationId: "version-loc-tr",
        locale: "tr",
        screenshotSet: {
          id: "set-tr",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
        screenshots: [
          {
            id: "screenshot-en-1",
            type: "appScreenshots",
            attributes: {
              fileName: "en-1.png",
            },
          },
        ],
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      1,
      client,
      "/appScreenshotSets/set-tr/appScreenshots",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      2,
      client,
      "/appScreenshotSets/set-en/appScreenshots",
    );
  });
});

describe("downloadAppleScreenshot", () => {
  it("downloads Apple screenshot binaries from an image asset template URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("apple-image").buffer,
      headers: new Headers({
        "content-type": "image/png",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        downloadAppleScreenshot({
          id: "screenshot-1",
          type: "appScreenshots",
          attributes: {
            fileName: "source.png",
            imageAsset: {
              templateUrl: "https://example.com/{w}x{h}.{f}",
              width: 1290,
              height: 2796,
            },
          },
        }),
      ).resolves.toEqual({
        buffer: new Uint8Array(new TextEncoder().encode("apple-image")),
        extension: ".png",
      });

      expect(fetchMock).toHaveBeenCalledWith("https://example.com/1290x2796.png");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("downloadAppleScreenshotSet", () => {
  it("writes Apple screenshots into the canonical local directory layout", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("apple-image").buffer,
        headers: new Headers({
          "content-type": "image/png",
        }),
      }),
    );

    try {
      const result = await downloadAppleScreenshotSet(screenshotsBaseDir, {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSet: {
          id: "set-en",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
        screenshots: [
          {
            id: "screenshot-en-1",
            type: "appScreenshots",
            attributes: {
              fileName: "hero.png",
              imageAsset: {
                url: "https://example.com/hero.png",
              },
            },
          },
        ],
      });

      expect(result).toEqual({
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        files: [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            filePath: join(
              screenshotsBaseDir,
              "apple",
              "en-US",
              "APP_IPHONE_65",
              "1.png",
            ),
            fileName: "1.png",
            position: 1,
          },
        ],
      });
      await expect(
        readFile(
          join(
            screenshotsBaseDir,
            "apple",
            "en-US",
            "APP_IPHONE_65",
            "1.png",
          ),
          "utf8",
        ),
      ).resolves.toBe("apple-image");
    } finally {
      vi.unstubAllGlobals();
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });

  it("renames Apple screenshots into deterministic numeric file order", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode("second-image").buffer,
          headers: new Headers({
            "content-type": "image/png",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode("first-image").buffer,
          headers: new Headers({
            "content-type": "image/png",
          }),
        }),
    );

    try {
      const result = await downloadAppleScreenshotSet(screenshotsBaseDir, {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSet: {
          id: "set-en",
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
        },
        screenshots: [
          {
            id: "screenshot-b",
            type: "appScreenshots",
            attributes: {
              fileName: "z-last.png",
              imageAsset: {
                url: "https://example.com/z-last.png",
              },
            },
          },
          {
            id: "screenshot-a",
            type: "appScreenshots",
            attributes: {
              fileName: "a-first.png",
              imageAsset: {
                url: "https://example.com/a-first.png",
              },
            },
          },
        ],
      });

      expect(result.files.map((file) => file.fileName)).toEqual(["1.png", "2.png"]);
      await expect(
        readFile(
          join(
            screenshotsBaseDir,
            "apple",
            "en-US",
            "APP_IPHONE_65",
            "1.png",
          ),
          "utf8",
        ),
      ).resolves.toBe("second-image");
      await expect(
        readFile(
          join(
            screenshotsBaseDir,
            "apple",
            "en-US",
            "APP_IPHONE_65",
            "2.png",
          ),
          "utf8",
        ),
      ).resolves.toBe("first-image");
    } finally {
      vi.unstubAllGlobals();
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });
});
