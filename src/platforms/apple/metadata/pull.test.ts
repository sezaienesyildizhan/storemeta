import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAppleAppInfoLocalizations,
  fetchAppleAppStoreVersionLocalizations,
  mergeAppleLocalizations,
  normalizeMergedAppleLocalization,
  normalizeMergedAppleLocalizations,
  selectPreferredAppleAppStoreVersion,
  writeAppleMetadataDocument,
} from "./pull.js";
import type { AppStoreConnectClient } from "../client.js";

const { requestAllAppStoreConnectPagesMock } = vi.hoisted(() => ({
  requestAllAppStoreConnectPagesMock: vi.fn(),
}));

vi.mock("../client.js", async () => {
  const actual = await vi.importActual("../client.js");

  return {
    ...actual,
    requestAllAppStoreConnectPages: requestAllAppStoreConnectPagesMock,
  };
});

beforeEach(() => {
  requestAllAppStoreConnectPagesMock.mockReset();
});

describe("fetchAppleAppInfoLocalizations", () => {
  it("resolves app info localizations through the appInfos relationship", async () => {
    requestAllAppStoreConnectPagesMock
      .mockResolvedValueOnce([
        {
          id: "app-info-1",
          type: "appInfos",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "app-info-loc-1",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Example App",
          },
        },
      ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppInfoLocalizations(client, "1234567890"),
    ).resolves.toEqual([
      {
        id: "app-info-loc-1",
        type: "appInfoLocalizations",
        attributes: {
          locale: "en-US",
          name: "Example App",
        },
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      1,
      client,
      "/apps/1234567890/appInfos",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      2,
      client,
      "/appInfos/app-info-1/appInfoLocalizations",
    );
  });

  it("returns an empty list when the app has no app info resources", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppInfoLocalizations(client, "1234567890"),
    ).resolves.toEqual([]);
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledTimes(1);
  });
});

describe("selectPreferredAppleAppStoreVersion", () => {
  it("prefers the latest editable iOS version", () => {
    expect(
      selectPreferredAppleAppStoreVersion([
        {
          id: "live-ios",
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            appStoreState: "READY_FOR_SALE",
            createdDate: "2024-01-01T00:00:00Z",
          },
        },
        {
          id: "editable-ios",
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            appStoreState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2024-02-01T00:00:00Z",
          },
        },
        {
          id: "editable-mac",
          type: "appStoreVersions",
          attributes: {
            platform: "MAC_OS",
            appStoreState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2024-03-01T00:00:00Z",
          },
        },
      ]),
    )?.toMatchObject({
      id: "editable-ios",
    });
  });

  it("falls back to the live iOS version and then the latest version overall", () => {
    expect(
      selectPreferredAppleAppStoreVersion([
        {
          id: "live-ios",
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            appStoreState: "READY_FOR_SALE",
            createdDate: "2024-01-01T00:00:00Z",
          },
        },
        {
          id: "mac-only",
          type: "appStoreVersions",
          attributes: {
            platform: "MAC_OS",
            appStoreState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2024-02-01T00:00:00Z",
          },
        },
      ]),
    )?.toMatchObject({
      id: "live-ios",
    });

    expect(
      selectPreferredAppleAppStoreVersion([
        {
          id: "mac-only",
          type: "appStoreVersions",
          attributes: {
            platform: "MAC_OS",
            appStoreState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2024-02-01T00:00:00Z",
          },
        },
      ]),
    )?.toMatchObject({
      id: "mac-only",
    });
  });
});

describe("fetchAppleAppStoreVersionLocalizations", () => {
  it("fetches localizations from the preferred app store version", async () => {
    requestAllAppStoreConnectPagesMock
      .mockResolvedValueOnce([
        {
          id: "live-ios",
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            appStoreState: "READY_FOR_SALE",
            createdDate: "2024-01-01T00:00:00Z",
          },
        },
        {
          id: "editable-ios",
          type: "appStoreVersions",
          attributes: {
            platform: "IOS",
            appStoreState: "PREPARE_FOR_SUBMISSION",
            createdDate: "2024-02-01T00:00:00Z",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "version-loc-1",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "en-US",
            description: "Example",
          },
        },
      ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppStoreVersionLocalizations(client, "1234567890"),
    ).resolves.toEqual([
      {
        id: "version-loc-1",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
          description: "Example",
        },
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      1,
      client,
      "/apps/1234567890/appStoreVersions",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      2,
      client,
      "/appStoreVersions/editable-ios/appStoreVersionLocalizations",
    );
  });

  it("returns an empty list when no app store versions exist", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppStoreVersionLocalizations(client, "1234567890"),
    ).resolves.toEqual([]);
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledTimes(1);
  });
});

describe("mergeAppleLocalizations", () => {
  it("joins app info and app store version localizations by locale", () => {
    expect(
      mergeAppleLocalizations(
        [
          {
            id: "app-info-en",
            type: "appInfoLocalizations",
            attributes: {
              locale: "en-US",
              name: "Example App",
            },
          },
          {
            id: "app-info-tr",
            type: "appInfoLocalizations",
            attributes: {
              locale: "tr",
              name: "Ornek",
            },
          },
        ],
        [
          {
            id: "version-en",
            type: "appStoreVersionLocalizations",
            attributes: {
              locale: "en-US",
              description: "Description",
            },
          },
          {
            id: "version-fr",
            type: "appStoreVersionLocalizations",
            attributes: {
              locale: "fr-FR",
              description: "Description FR",
            },
          },
        ],
      ),
    ).toEqual([
      {
        locale: "en-US",
        appInfoLocalization: {
          id: "app-info-en",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Example App",
          },
        },
        appStoreVersionLocalization: {
          id: "version-en",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "en-US",
            description: "Description",
          },
        },
      },
      {
        locale: "fr-FR",
        appStoreVersionLocalization: {
          id: "version-fr",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "fr-FR",
            description: "Description FR",
          },
        },
      },
      {
        locale: "tr",
        appInfoLocalization: {
          id: "app-info-tr",
          type: "appInfoLocalizations",
          attributes: {
            locale: "tr",
            name: "Ornek",
          },
        },
      },
    ]);
  });
});

describe("normalizeMergedAppleLocalization", () => {
  it("maps merged Apple localization data into the local metadata schema", () => {
    expect(
      normalizeMergedAppleLocalization({
        locale: "en_us",
        appInfoLocalization: {
          id: "app-info-en",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Example App",
            subtitle: "Subtitle",
            privacyPolicyUrl: "https://example.com/privacy",
          },
        },
        appStoreVersionLocalization: {
          id: "version-en",
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "en-US",
            description: "Description",
            keywords: "one,two",
            marketingUrl: "https://example.com",
            promotionalText: "Promo",
            supportUrl: "https://example.com/support",
            whatsNew: "Bug fixes",
          },
        },
      }),
    ).toEqual({
      locale: "en-US",
      app_name: "Example App",
      subtitle: "Subtitle",
      privacy_policy_url: "https://example.com/privacy",
      description: "Description",
      keywords: "one,two",
      marketing_url: "https://example.com",
      promotional_text: "Promo",
      support_url: "https://example.com/support",
      whats_new: "Bug fixes",
    });
  });
});

describe("normalizeMergedAppleLocalizations", () => {
  it("normalizes all merged Apple localizations in order", () => {
    expect(
      normalizeMergedAppleLocalizations([
        {
          locale: "tr",
        },
        {
          locale: "en-US",
        },
      ]),
    ).toEqual([
      {
        locale: "tr",
      },
      {
        locale: "en-US",
      },
    ]);
  });
});

describe("writeAppleMetadataDocument", () => {
  it("writes one Apple metadata file per locale in the canonical layout", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));

    try {
      const filePath = await writeAppleMetadataDocument(metadataBaseDir, {
        locale: "en_us",
        app_name: "Example App",
      });

      expect(filePath).toBe(join(metadataBaseDir, "apple", "en-US.yml"));
      await expect(readFile(filePath, "utf8")).resolves.toContain(
        "locale: en-US",
      );
      await expect(readFile(filePath, "utf8")).resolves.toContain(
        "app_name: Example App",
      );
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });
});
