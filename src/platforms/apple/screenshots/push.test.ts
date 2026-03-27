import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAppleScreenshotUploadTargets,
  loadAppleScreenshotSets,
  resolveOrCreateAppleScreenshotUploadTargets,
  resolveOrCreateAppleScreenshotLocalizations,
} from "./push.js";
import type { AppStoreConnectClient } from "../client.js";

const {
  fetchAppleScreenshotSetsForLocalizationsMock,
  fetchAppleScreenshotsForSetsMock,
  postAppStoreConnectJsonMock,
  requestAllAppStoreConnectPagesMock,
  resolveEditableAppleAppStoreVersionResourceMock,
} = vi.hoisted(() => ({
  fetchAppleScreenshotSetsForLocalizationsMock: vi.fn(),
  fetchAppleScreenshotsForSetsMock: vi.fn(),
  postAppStoreConnectJsonMock: vi.fn(),
  requestAllAppStoreConnectPagesMock: vi.fn(),
  resolveEditableAppleAppStoreVersionResourceMock: vi.fn(),
}));

vi.mock("./pull.js", async () => {
  const actual = await vi.importActual("./pull.js");

  return {
    ...actual,
    fetchAppleScreenshotsForSets: fetchAppleScreenshotsForSetsMock,
    fetchAppleScreenshotSetsForLocalizations:
      fetchAppleScreenshotSetsForLocalizationsMock,
  };
});

vi.mock("../client.js", async () => {
  const actual = await vi.importActual("../client.js");

  return {
    ...actual,
    postAppStoreConnectJson: postAppStoreConnectJsonMock,
    requestAllAppStoreConnectPages: requestAllAppStoreConnectPagesMock,
  };
});

vi.mock("../metadata/push.js", async () => {
  const actual = await vi.importActual("../metadata/push.js");

  return {
    ...actual,
    resolveEditableAppleAppStoreVersionResource:
      resolveEditableAppleAppStoreVersionResourceMock,
  };
});

beforeEach(() => {
  fetchAppleScreenshotsForSetsMock.mockReset();
  fetchAppleScreenshotSetsForLocalizationsMock.mockReset();
  postAppStoreConnectJsonMock.mockReset();
  requestAllAppStoreConnectPagesMock.mockReset();
  resolveEditableAppleAppStoreVersionResourceMock.mockReset();
});

describe("loadAppleScreenshotSets", () => {
  it("loads Apple screenshot sets from the canonical local layout", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const screenshotDirectory = join(
      screenshotsBaseDir,
      "apple",
      "en_us",
      "APP_IPHONE_65",
    );

    await mkdir(screenshotDirectory, { recursive: true });
    await writeFile(join(screenshotDirectory, "1.png"), "first");
    await writeFile(join(screenshotDirectory, "2.jpg"), "second");

    try {
      await expect(loadAppleScreenshotSets(screenshotsBaseDir)).resolves.toEqual([
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          files: [
            {
              platform: "apple",
              locale: "en-US",
              assetType: "APP_IPHONE_65",
              filePath: join(screenshotDirectory, "1.png"),
              fileName: "1.png",
              position: 1,
            },
            {
              platform: "apple",
              locale: "en-US",
              assetType: "APP_IPHONE_65",
              filePath: join(screenshotDirectory, "2.jpg"),
              fileName: "2.jpg",
              position: 2,
            },
          ],
        },
      ]);
    } finally {
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });

  it("rejects non-numeric Apple screenshot file names", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const screenshotDirectory = join(
      screenshotsBaseDir,
      "apple",
      "en-US",
      "APP_IPHONE_65",
    );

    await mkdir(screenshotDirectory, { recursive: true });
    await writeFile(join(screenshotDirectory, "cover.png"), "first");

    try {
      await expect(loadAppleScreenshotSets(screenshotsBaseDir)).rejects.toThrow(
        /expected a numeric filename/,
      );
    } finally {
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });
});

describe("resolveOrCreateAppleScreenshotLocalizations", () => {
  it("creates only the missing Apple screenshot localizations", async () => {
    resolveEditableAppleAppStoreVersionResourceMock.mockResolvedValueOnce({
      id: "version-1",
      type: "appStoreVersions",
    });
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);
    postAppStoreConnectJsonMock.mockResolvedValueOnce({
      data: {
        id: "version-loc-tr",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "tr",
        },
      },
    });

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveOrCreateAppleScreenshotLocalizations(client, "1234567890", [
        {
          platform: "apple",
          locale: "tr",
          assetType: "APP_IPHONE_65",
          files: [],
        },
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          files: [],
        },
      ]),
    ).resolves.toEqual([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
      {
        id: "version-loc-tr",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "tr",
        },
      },
    ]);

    expect(resolveEditableAppleAppStoreVersionResourceMock).toHaveBeenCalledWith(
      client,
      "1234567890",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/appStoreVersions/version-1/appStoreVersionLocalizations",
    );
    expect(postAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appStoreVersionLocalizations",
      {
        data: {
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "tr",
          },
          relationships: {
            appStoreVersion: {
              data: {
                type: "appStoreVersions",
                id: "version-1",
              },
            },
          },
        },
      },
    );
  });

  it("fails when Apple does not return an id for a created screenshot localization", async () => {
    resolveEditableAppleAppStoreVersionResourceMock.mockResolvedValueOnce({
      id: "version-1",
      type: "appStoreVersions",
    });
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);
    postAppStoreConnectJsonMock.mockResolvedValueOnce({
      data: {
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    });

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveOrCreateAppleScreenshotLocalizations(client, "1234567890", [
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          files: [],
        },
      ]),
    ).rejects.toThrow(
      /did not return an app store version localization id for locale en-US/,
    );
  });
});

describe("resolveOrCreateAppleScreenshotUploadTargets", () => {
  it("reuses existing screenshot sets and creates missing display types", async () => {
    fetchAppleScreenshotSetsForLocalizationsMock.mockResolvedValueOnce([
      {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSets: [
          {
            id: "set-en-65",
            type: "appScreenshotSets",
            attributes: {
              screenshotDisplayType: "APP_IPHONE_65",
            },
          },
        ],
      },
    ]);
    postAppStoreConnectJsonMock.mockResolvedValueOnce({
      data: {
        id: "set-tr-65",
        type: "appScreenshotSets",
        attributes: {
          screenshotDisplayType: "APP_IPHONE_65",
        },
      },
    });

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveOrCreateAppleScreenshotUploadTargets(
        client,
        [
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
        ],
        [
          {
            platform: "apple",
            locale: "tr",
            assetType: "APP_IPHONE_65",
            files: [],
          },
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            files: [],
          },
        ],
      ),
    ).resolves.toEqual([
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        files: [],
        localizationId: "version-loc-en",
        screenshotSetId: "set-en-65",
      },
      {
        platform: "apple",
        locale: "tr",
        assetType: "APP_IPHONE_65",
        files: [],
        localizationId: "version-loc-tr",
        screenshotSetId: "set-tr-65",
      },
    ]);

    expect(fetchAppleScreenshotSetsForLocalizationsMock).toHaveBeenCalledWith(
      client,
      [
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
      ],
    );
    expect(postAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appScreenshotSets",
      {
        data: {
          type: "appScreenshotSets",
          attributes: {
            screenshotDisplayType: "APP_IPHONE_65",
          },
          relationships: {
            appStoreVersionLocalization: {
              data: {
                type: "appStoreVersionLocalizations",
                id: "version-loc-tr",
              },
            },
          },
        },
      },
    );
  });

  it("fails when Apple does not return a screenshot set id", async () => {
    fetchAppleScreenshotSetsForLocalizationsMock.mockResolvedValueOnce([]);
    postAppStoreConnectJsonMock.mockResolvedValueOnce({
      data: {
        type: "appScreenshotSets",
        attributes: {
          screenshotDisplayType: "APP_IPHONE_65",
        },
      },
    });

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveOrCreateAppleScreenshotUploadTargets(
        client,
        [
          {
            id: "version-loc-en",
            type: "appStoreVersionLocalizations",
            attributes: {
              locale: "en-US",
            },
          },
        ],
        [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            files: [],
          },
        ],
      ),
    ).rejects.toThrow(
      /did not return an app screenshot set id for locale en-US and display type APP_IPHONE_65/,
    );
  });
});

describe("clearAppleScreenshotUploadTargets", () => {
  it("deletes existing Apple screenshots when replacement is enabled", async () => {
    fetchAppleScreenshotsForSetsMock.mockResolvedValueOnce([
      {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSet: {
          id: "set-en-65",
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
              fileName: "1.png",
            },
          },
          {
            id: "screenshot-en-2",
            type: "appScreenshots",
            attributes: {
              fileName: "2.png",
            },
          },
        ],
      },
    ]);

    const requestMock = vi.fn().mockResolvedValue(undefined);
    const client = {
      request: requestMock,
    } as unknown as AppStoreConnectClient;

    await expect(
      clearAppleScreenshotUploadTargets(
        client,
        [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            files: [],
            localizationId: "version-loc-en",
            screenshotSetId: "set-en-65",
          },
        ],
        {
          clearExisting: true,
        },
      ),
    ).resolves.toEqual([
      {
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        screenshotSetId: "set-en-65",
        deletedScreenshotIds: ["screenshot-en-1", "screenshot-en-2"],
      },
    ]);

    expect(fetchAppleScreenshotsForSetsMock).toHaveBeenCalledWith(client, [
      {
        localizationId: "version-loc-en",
        locale: "en-US",
        screenshotSets: [
          {
            id: "set-en-65",
            type: "appScreenshotSets",
            attributes: {
              screenshotDisplayType: "APP_IPHONE_65",
            },
          },
        ],
      },
    ]);
    expect(requestMock).toHaveBeenNthCalledWith(1, "/appScreenshots/screenshot-en-1", {
      method: "DELETE",
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, "/appScreenshots/screenshot-en-2", {
      method: "DELETE",
    });
  });

  it("skips Apple screenshot deletions when replacement is disabled", async () => {
    const requestMock = vi.fn();
    const client = {
      request: requestMock,
    } as unknown as AppStoreConnectClient;

    await expect(
      clearAppleScreenshotUploadTargets(
        client,
        [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            files: [],
            localizationId: "version-loc-en",
            screenshotSetId: "set-en-65",
          },
        ],
        {
          clearExisting: false,
        },
      ),
    ).resolves.toEqual([]);

    expect(fetchAppleScreenshotsForSetsMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });
});
