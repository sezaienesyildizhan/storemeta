import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMissingAppleAppInfoLocalizations,
  createMissingAppleAppStoreVersionLocalizations,
  loadAppleMetadataDocuments,
  updateExistingAppleAppStoreVersionLocalizations,
  updateExistingAppleAppInfoLocalizations,
  resolveAppleAppInfoResource,
  resolveEditableAppleAppStoreVersionResource,
  selectAppleAppInfoResource,
  selectEditableAppleAppStoreVersion,
} from "../../../../src/platforms/apple/metadata/push.js";
import type { AppStoreConnectClient } from "../../../../src/platforms/apple/client.js";

const {
  postAppStoreConnectJsonMock,
  requestAllAppStoreConnectPagesMock,
  patchAppStoreConnectJsonMock,
} = vi.hoisted(() => ({
  postAppStoreConnectJsonMock: vi.fn(),
  requestAllAppStoreConnectPagesMock: vi.fn(),
  patchAppStoreConnectJsonMock: vi.fn(),
}));

vi.mock("../../../../src/platforms/apple/client.js", async () => {
  const actual = await vi.importActual("../../../../src/platforms/apple/client.js");

  return {
    ...actual,
    patchAppStoreConnectJson: patchAppStoreConnectJsonMock,
    postAppStoreConnectJson: postAppStoreConnectJsonMock,
    requestAllAppStoreConnectPages: requestAllAppStoreConnectPagesMock,
  };
});

beforeEach(() => {
  postAppStoreConnectJsonMock.mockReset();
  requestAllAppStoreConnectPagesMock.mockReset();
  patchAppStoreConnectJsonMock.mockReset();
});

describe("loadAppleMetadataDocuments", () => {
  it("loads and validates Apple metadata documents from the canonical directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(
      join(appleMetadataDirectory, "tr.yml"),
      "locale: tr\napp_name: Ornek\n",
    );
    await writeFile(
      join(appleMetadataDirectory, "en-US.yaml"),
      "locale: en-US\napp_name: Example App\n",
    );

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([
        {
          locale: "en-US",
          app_name: "Example App",
        },
        {
          locale: "tr",
          app_name: "Ornek",
        },
      ]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });

  it("ignores unsupported file extensions in the Apple metadata directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(join(appleMetadataDirectory, "notes.txt"), "ignore me");

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });
});

describe("selectAppleAppInfoResource", () => {
  it("prefers an iOS app info resource when multiple exist", () => {
    expect(
      selectAppleAppInfoResource([
        {
          id: "mac-app-info",
          type: "appInfos",
          attributes: {
            platform: "MAC_OS",
          },
        },
        {
          id: "ios-app-info",
          type: "appInfos",
          attributes: {
            platform: "IOS",
          },
        },
      ]),
    )?.toMatchObject({
      id: "ios-app-info",
    });
  });
});

describe("resolveAppleAppInfoResource", () => {
  it("loads the target app info resource for an app", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "ios-app-info",
        type: "appInfos",
        attributes: {
          platform: "IOS",
        },
      },
    ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveAppleAppInfoResource(client, "1234567890"),
    ).resolves.toEqual({
      id: "ios-app-info",
      type: "appInfos",
      attributes: {
        platform: "IOS",
      },
    });

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/apps/1234567890/appInfos",
    );
  });

  it("fails when no app info resource exists", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveAppleAppInfoResource(client, "1234567890"),
    ).rejects.toThrow(/returned no app info resource/);
  });
});

describe("selectEditableAppleAppStoreVersion", () => {
  it("prefers the latest editable iOS app store version", () => {
    expect(
      selectEditableAppleAppStoreVersion([
        {
          id: "ready-for-sale-ios",
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
});

describe("resolveEditableAppleAppStoreVersionResource", () => {
  it("loads the target editable app store version resource", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "editable-ios",
        type: "appStoreVersions",
        attributes: {
          platform: "IOS",
          appStoreState: "PREPARE_FOR_SUBMISSION",
          createdDate: "2024-02-01T00:00:00Z",
        },
      },
    ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveEditableAppleAppStoreVersionResource(client, "1234567890"),
    ).resolves.toEqual({
      id: "editable-ios",
      type: "appStoreVersions",
      attributes: {
        platform: "IOS",
        appStoreState: "PREPARE_FOR_SUBMISSION",
        createdDate: "2024-02-01T00:00:00Z",
      },
    });

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/apps/1234567890/appStoreVersions",
    );
  });

  it("fails when no editable app store version exists", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "ready-for-sale-ios",
        type: "appStoreVersions",
        attributes: {
          platform: "IOS",
          appStoreState: "READY_FOR_SALE",
          createdDate: "2024-01-01T00:00:00Z",
        },
      },
    ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveEditableAppleAppStoreVersionResource(client, "1234567890"),
    ).rejects.toThrow(/returned no editable app store version/);
  });
});

describe("updateExistingAppleAppInfoLocalizations", () => {
  it("patches only Apple app info localizations that already exist", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "app-info-loc-en",
        type: "appInfoLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);
    patchAppStoreConnectJsonMock.mockResolvedValue({});

    const client = {} as AppStoreConnectClient;

    await expect(
      updateExistingAppleAppInfoLocalizations(client, "app-info-1", [
        {
          locale: "en-US",
          app_name: "Example App",
          subtitle: "Subtitle",
          privacy_policy_url: "https://example.com/privacy",
        },
        {
          locale: "tr",
          app_name: "Ornek",
        },
      ]),
    ).resolves.toEqual([
      {
        locale: "en-US",
        localizationId: "app-info-loc-en",
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/appInfos/app-info-1/appInfoLocalizations",
    );
    expect(patchAppStoreConnectJsonMock).toHaveBeenCalledTimes(1);
    expect(patchAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appInfoLocalizations/app-info-loc-en",
      {
        data: {
          id: "app-info-loc-en",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Example App",
            subtitle: "Subtitle",
            privacyPolicyUrl: "https://example.com/privacy",
          },
        },
      },
    );
  });
});

describe("createMissingAppleAppInfoLocalizations", () => {
  it("creates only Apple app info localizations that do not already exist", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "app-info-loc-en",
        type: "appInfoLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);
    postAppStoreConnectJsonMock.mockResolvedValueOnce({
      data: {
        id: "app-info-loc-tr",
        type: "appInfoLocalizations",
        attributes: {
          locale: "tr",
        },
      },
    });

    const client = {} as AppStoreConnectClient;

    await expect(
      createMissingAppleAppInfoLocalizations(client, "app-info-1", [
        {
          locale: "en-US",
          app_name: "Example App",
        },
        {
          locale: "tr",
          app_name: "Ornek",
          subtitle: "Alt baslik",
          privacy_policy_url: "https://example.com/privacy-tr",
        },
      ]),
    ).resolves.toEqual([
      {
        locale: "tr",
        localizationId: "app-info-loc-tr",
      },
    ]);

    expect(postAppStoreConnectJsonMock).toHaveBeenCalledTimes(1);
    expect(postAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appInfoLocalizations",
      {
        data: {
          type: "appInfoLocalizations",
          attributes: {
            locale: "tr",
            name: "Ornek",
            subtitle: "Alt baslik",
            privacyPolicyUrl: "https://example.com/privacy-tr",
          },
          relationships: {
            appInfo: {
              data: {
                type: "appInfos",
                id: "app-info-1",
              },
            },
          },
        },
      },
    );
  });
});

describe("updateExistingAppleAppStoreVersionLocalizations", () => {
  it("patches only Apple app store version localizations that already exist", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);
    patchAppStoreConnectJsonMock.mockResolvedValue({});

    const client = {} as AppStoreConnectClient;

    await expect(
      updateExistingAppleAppStoreVersionLocalizations(client, "version-1", [
        {
          locale: "en-US",
          description: "Description",
          keywords: "one,two",
          marketing_url: "https://example.com",
          promotional_text: "Promo",
          support_url: "https://example.com/support",
          whats_new: "Bug fixes",
        },
        {
          locale: "tr",
          description: "Aciklama",
        },
      ]),
    ).resolves.toEqual([
      {
        locale: "en-US",
        localizationId: "version-loc-en",
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/appStoreVersions/version-1/appStoreVersionLocalizations",
    );
    expect(patchAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appStoreVersionLocalizations/version-loc-en",
      {
        data: {
          id: "version-loc-en",
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
      },
    );
  });
});

describe("createMissingAppleAppStoreVersionLocalizations", () => {
  it("creates only Apple app store version localizations that do not already exist", async () => {
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
      createMissingAppleAppStoreVersionLocalizations(client, "version-1", [
        {
          locale: "en-US",
          description: "Description",
        },
        {
          locale: "tr",
          description: "Aciklama",
          keywords: "bir,iki",
          marketing_url: "https://example.com/tr",
          promotional_text: "Promosyon",
          support_url: "https://example.com/destek",
          whats_new: "Hata duzeltmeleri",
        },
      ]),
    ).resolves.toEqual([
      {
        locale: "tr",
        localizationId: "version-loc-tr",
      },
    ]);

    expect(postAppStoreConnectJsonMock).toHaveBeenCalledTimes(1);
    expect(postAppStoreConnectJsonMock).toHaveBeenCalledWith(
      client,
      "/appStoreVersionLocalizations",
      {
        data: {
          type: "appStoreVersionLocalizations",
          attributes: {
            locale: "tr",
            description: "Aciklama",
            keywords: "bir,iki",
            marketingUrl: "https://example.com/tr",
            promotionalText: "Promosyon",
            supportUrl: "https://example.com/destek",
            whatsNew: "Hata duzeltmeleri",
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
});
