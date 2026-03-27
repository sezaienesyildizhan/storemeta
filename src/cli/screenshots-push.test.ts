import { beforeEach, describe, expect, it, vi } from "vitest";

import { runScreenshotsPushCommand } from "./screenshots-push.js";

const {
  loadConfigFileMock,
  validateRootConfigMock,
  selectConfiguredAppMock,
  resolveSelectedPlatformsMock,
  loadAppleScreenshotSetsMock,
  clearAppleScreenshotUploadTargetsMock,
  createAppStoreConnectClientMock,
  resolveOrCreateAppleScreenshotLocalizationsMock,
  resolveOrCreateAppleScreenshotUploadTargetsMock,
  reserveAppleScreenshotUploadsMock,
  uploadReservedAppleScreenshotsMock,
  commitAppleScreenshotUploadsMock,
} = vi.hoisted(() => ({
  loadConfigFileMock: vi.fn(),
  validateRootConfigMock: vi.fn(),
  selectConfiguredAppMock: vi.fn(),
  resolveSelectedPlatformsMock: vi.fn(),
  loadAppleScreenshotSetsMock: vi.fn(),
  clearAppleScreenshotUploadTargetsMock: vi.fn(),
  createAppStoreConnectClientMock: vi.fn(),
  resolveOrCreateAppleScreenshotLocalizationsMock: vi.fn(),
  resolveOrCreateAppleScreenshotUploadTargetsMock: vi.fn(),
  reserveAppleScreenshotUploadsMock: vi.fn(),
  uploadReservedAppleScreenshotsMock: vi.fn(),
  commitAppleScreenshotUploadsMock: vi.fn(),
}));

vi.mock("../config/load-config.js", () => ({
  loadConfigFile: loadConfigFileMock,
}));

vi.mock("../config/schema.js", () => ({
  validateRootConfig: validateRootConfigMock,
}));

vi.mock("../config/select-app.js", () => ({
  selectConfiguredApp: selectConfiguredAppMock,
}));

vi.mock("../config/select-platforms.js", () => ({
  resolveSelectedPlatforms: resolveSelectedPlatformsMock,
}));

vi.mock("../platforms/apple/client.js", () => ({
  createAppStoreConnectClient: createAppStoreConnectClientMock,
}));

vi.mock("../platforms/apple/screenshots/push.js", () => ({
  clearAppleScreenshotUploadTargets: clearAppleScreenshotUploadTargetsMock,
  loadAppleScreenshotSets: loadAppleScreenshotSetsMock,
  resolveOrCreateAppleScreenshotLocalizations:
    resolveOrCreateAppleScreenshotLocalizationsMock,
  resolveOrCreateAppleScreenshotUploadTargets:
    resolveOrCreateAppleScreenshotUploadTargetsMock,
  reserveAppleScreenshotUploads: reserveAppleScreenshotUploadsMock,
  uploadReservedAppleScreenshots: uploadReservedAppleScreenshotsMock,
  commitAppleScreenshotUploads: commitAppleScreenshotUploadsMock,
}));

beforeEach(() => {
  loadConfigFileMock.mockReset();
  validateRootConfigMock.mockReset();
  selectConfiguredAppMock.mockReset();
  resolveSelectedPlatformsMock.mockReset();
  loadAppleScreenshotSetsMock.mockReset();
  clearAppleScreenshotUploadTargetsMock.mockReset();
  createAppStoreConnectClientMock.mockReset();
  resolveOrCreateAppleScreenshotLocalizationsMock.mockReset();
  resolveOrCreateAppleScreenshotUploadTargetsMock.mockReset();
  reserveAppleScreenshotUploadsMock.mockReset();
  uploadReservedAppleScreenshotsMock.mockReset();
  commitAppleScreenshotUploadsMock.mockReset();
  vi.restoreAllMocks();
});

describe("runScreenshotsPushCommand", () => {
  it("supports Apple screenshot dry runs", async () => {
    loadConfigFileMock.mockResolvedValueOnce({
      path: "/tmp/storemeta.yml",
      parsed: {},
    });
    validateRootConfigMock.mockReturnValueOnce({
      project: {
        name: "Storemeta",
        defaultApp: "demo",
      },
      apps: {},
    });
    selectConfiguredAppMock.mockReturnValueOnce({
      id: "demo",
      settings: {
        screenshots: {
          baseDir: "screenshots",
        },
        apple: {
          appId: "1234567890",
          credentials: {
            issuerIdEnv: "APPLE_ISSUER_ID",
            keyIdEnv: "APPLE_KEY_ID",
            privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
          },
        },
      },
    });
    resolveSelectedPlatformsMock.mockReturnValueOnce(["apple"]);
    loadAppleScreenshotSetsMock.mockResolvedValueOnce([
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        files: [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
            fileName: "1.png",
            position: 1,
          },
        ],
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runScreenshotsPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        locale: "en_us",
        dryRun: true,
        replace: false,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "apple/en-US/APP_IPHONE_65",
          success: true,
          message: "Would upload 1 screenshots",
        },
      ],
    });

    expect(logSpy).toHaveBeenCalledWith(
      "DRY RUN apple screenshots en-US/APP_IPHONE_65 (1 files)",
    );
    expect(createAppStoreConnectClientMock).not.toHaveBeenCalled();
    expect(resolveOrCreateAppleScreenshotLocalizationsMock).not.toHaveBeenCalled();
    expect(resolveOrCreateAppleScreenshotUploadTargetsMock).not.toHaveBeenCalled();
    expect(reserveAppleScreenshotUploadsMock).not.toHaveBeenCalled();
    expect(uploadReservedAppleScreenshotsMock).not.toHaveBeenCalled();
    expect(commitAppleScreenshotUploadsMock).not.toHaveBeenCalled();
  });

  it("prints per-locale Apple screenshot upload progress", async () => {
    loadConfigFileMock.mockResolvedValueOnce({
      path: "/tmp/storemeta.yml",
      parsed: {},
    });
    validateRootConfigMock.mockReturnValueOnce({
      project: {
        name: "Storemeta",
        defaultApp: "demo",
      },
      apps: {},
    });
    selectConfiguredAppMock.mockReturnValueOnce({
      id: "demo",
      settings: {
        screenshots: {
          baseDir: "screenshots",
        },
        apple: {
          appId: "1234567890",
          credentials: {
            issuerIdEnv: "APPLE_ISSUER_ID",
            keyIdEnv: "APPLE_KEY_ID",
            privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
          },
        },
      },
    });
    resolveSelectedPlatformsMock.mockReturnValueOnce(["apple"]);
    loadAppleScreenshotSetsMock.mockResolvedValueOnce([
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        files: [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
            fileName: "1.png",
            position: 1,
          },
        ],
      },
    ]);
    createAppStoreConnectClientMock.mockReturnValueOnce({ id: "apple-client" });
    resolveOrCreateAppleScreenshotLocalizationsMock.mockResolvedValueOnce([
      {
        id: "version-loc-en",
        type: "appStoreVersionLocalizations",
        attributes: {
          locale: "en-US",
        },
      },
    ]);
    resolveOrCreateAppleScreenshotUploadTargetsMock.mockResolvedValueOnce([
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        files: [
          {
            platform: "apple",
            locale: "en-US",
            assetType: "APP_IPHONE_65",
            filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
            fileName: "1.png",
            position: 1,
          },
        ],
        localizationId: "version-loc-en",
        screenshotSetId: "set-en-65",
      },
    ]);
    clearAppleScreenshotUploadTargetsMock.mockResolvedValueOnce([]);
    reserveAppleScreenshotUploadsMock.mockResolvedValueOnce([
      {
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        screenshotSetId: "set-en-65",
        screenshotId: "screenshot-en-1",
        file: {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
          fileName: "1.png",
          position: 1,
        },
        uploadOperations: [],
      },
    ]);
    uploadReservedAppleScreenshotsMock.mockResolvedValueOnce([
      {
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        screenshotId: "screenshot-en-1",
        filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
      },
    ]);
    commitAppleScreenshotUploadsMock.mockResolvedValueOnce([
      {
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        screenshotId: "screenshot-en-1",
        filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
        sourceFileChecksum: "checksum",
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runScreenshotsPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        dryRun: false,
        replace: true,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "apple/en-US/APP_IPHONE_65",
          success: true,
          message: "Uploaded 1 screenshots",
        },
      ],
    });

    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      "Replacing apple screenshots en-US/APP_IPHONE_65 by deleting existing remote screenshots",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "Uploading apple screenshots en-US/APP_IPHONE_65 (1 files)",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      "Uploaded apple screenshots en-US/APP_IPHONE_65 (1 files)",
    );
    expect(clearAppleScreenshotUploadTargetsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      [
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          files: [
            {
              platform: "apple",
              locale: "en-US",
              assetType: "APP_IPHONE_65",
              filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
              fileName: "1.png",
              position: 1,
            },
          ],
          localizationId: "version-loc-en",
          screenshotSetId: "set-en-65",
        },
      ],
      {
        clearExisting: true,
      },
    );
    expect(reserveAppleScreenshotUploadsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      [
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          files: [
            {
              platform: "apple",
              locale: "en-US",
              assetType: "APP_IPHONE_65",
              filePath: "/tmp/screenshots/apple/en-US/APP_IPHONE_65/1.png",
              fileName: "1.png",
              position: 1,
            },
          ],
          localizationId: "version-loc-en",
          screenshotSetId: "set-en-65",
        },
      ],
    );
  });
});
