import { describe, expect, it, vi } from "vitest";

import {
  fetchAppleScreenshotLocalizations,
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
