import { beforeEach, describe, expect, it, vi } from "vitest";

import { runScreenshotsPullCommand } from "./screenshots-pull.js";

const {
  loadConfigFileMock,
  validateRootConfigMock,
  selectConfiguredAppMock,
  resolveSelectedPlatformsMock,
  createAppStoreConnectClientMock,
  fetchAppleScreenshotLocalizationsMock,
  filterAppleScreenshotLocalizationsByLocaleMock,
  fetchAppleScreenshotSetsForLocalizationsMock,
  fetchAppleScreenshotsForSetsMock,
  downloadAppleScreenshotSetMock,
  createGooglePlayClientMock,
  withGoogleEditSessionMock,
  expandGoogleScreenshotPullLocalesMock,
  listGoogleImagesForLocalesAndTypesMock,
  downloadGoogleScreenshotSetMock,
} = vi.hoisted(() => ({
  loadConfigFileMock: vi.fn(),
  validateRootConfigMock: vi.fn(),
  selectConfiguredAppMock: vi.fn(),
  resolveSelectedPlatformsMock: vi.fn(),
  createAppStoreConnectClientMock: vi.fn(),
  fetchAppleScreenshotLocalizationsMock: vi.fn(),
  filterAppleScreenshotLocalizationsByLocaleMock: vi.fn(),
  fetchAppleScreenshotSetsForLocalizationsMock: vi.fn(),
  fetchAppleScreenshotsForSetsMock: vi.fn(),
  downloadAppleScreenshotSetMock: vi.fn(),
  createGooglePlayClientMock: vi.fn(),
  withGoogleEditSessionMock: vi.fn(),
  expandGoogleScreenshotPullLocalesMock: vi.fn(),
  listGoogleImagesForLocalesAndTypesMock: vi.fn(),
  downloadGoogleScreenshotSetMock: vi.fn(),
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

vi.mock("../platforms/apple/screenshots/pull.js", () => ({
  fetchAppleScreenshotLocalizations: fetchAppleScreenshotLocalizationsMock,
  filterAppleScreenshotLocalizationsByLocale:
    filterAppleScreenshotLocalizationsByLocaleMock,
  fetchAppleScreenshotSetsForLocalizations:
    fetchAppleScreenshotSetsForLocalizationsMock,
  fetchAppleScreenshotsForSets: fetchAppleScreenshotsForSetsMock,
  downloadAppleScreenshotSet: downloadAppleScreenshotSetMock,
}));

vi.mock("../platforms/google/client.js", () => ({
  createGooglePlayClient: createGooglePlayClientMock,
}));

vi.mock("../platforms/google/edits.js", () => ({
  withGoogleEditSession: withGoogleEditSessionMock,
}));

vi.mock("../platforms/google/screenshots/pull.js", () => ({
  expandGoogleScreenshotPullLocales: expandGoogleScreenshotPullLocalesMock,
  listGoogleImagesForLocalesAndTypes: listGoogleImagesForLocalesAndTypesMock,
  downloadGoogleScreenshotSet: downloadGoogleScreenshotSetMock,
}));

beforeEach(() => {
  loadConfigFileMock.mockReset();
  validateRootConfigMock.mockReset();
  selectConfiguredAppMock.mockReset();
  resolveSelectedPlatformsMock.mockReset();
  createAppStoreConnectClientMock.mockReset();
  fetchAppleScreenshotLocalizationsMock.mockReset();
  filterAppleScreenshotLocalizationsByLocaleMock.mockReset();
  fetchAppleScreenshotSetsForLocalizationsMock.mockReset();
  fetchAppleScreenshotsForSetsMock.mockReset();
  downloadAppleScreenshotSetMock.mockReset();
  createGooglePlayClientMock.mockReset();
  withGoogleEditSessionMock.mockReset();
  expandGoogleScreenshotPullLocalesMock.mockReset();
  listGoogleImagesForLocalesAndTypesMock.mockReset();
  downloadGoogleScreenshotSetMock.mockReset();
  vi.restoreAllMocks();
});

function mockSharedConfig(platform: "apple" | "google") {
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
      metadata: {
        baseDir: "metadata",
        format: "yaml",
      },
      screenshots: {
        baseDir: "screenshots",
      },
      apple:
        platform === "apple"
          ? {
              appId: "1234567890",
              credentials: {
                issuerIdEnv: "APPLE_ISSUER_ID",
                keyIdEnv: "APPLE_KEY_ID",
                privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
              },
            }
          : undefined,
      google:
        platform === "google"
          ? {
              packageName: "com.example.demo",
              credentials: {
                serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
              },
              locales: {
                default: ["en-US"],
              },
            }
          : undefined,
    },
  });
  resolveSelectedPlatformsMock.mockReturnValueOnce([platform]);
}

describe("runScreenshotsPullCommand", () => {
  it("pulls Apple screenshots and reports downloaded sets", async () => {
    mockSharedConfig("apple");
    createAppStoreConnectClientMock.mockReturnValueOnce({ id: "apple-client" });
    fetchAppleScreenshotLocalizationsMock.mockResolvedValueOnce([
      { id: "loc-en", attributes: { locale: "en-US" } },
    ]);
    filterAppleScreenshotLocalizationsByLocaleMock.mockReturnValueOnce([
      { id: "loc-en", attributes: { locale: "en-US" } },
    ]);
    fetchAppleScreenshotSetsForLocalizationsMock.mockResolvedValueOnce([
      { localizationId: "loc-en", locale: "en-US", screenshotSets: [] },
    ]);
    fetchAppleScreenshotsForSetsMock.mockResolvedValueOnce([
      { locale: "en-US", screenshotSet: { id: "set-1" }, screenshots: [] },
    ]);
    downloadAppleScreenshotSetMock.mockResolvedValueOnce({
      platform: "apple",
      locale: "en-US",
      assetType: "APP_IPHONE_65",
      files: [],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runScreenshotsPullCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        locale: "en_us",
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
          message: "Pulled 0 screenshots",
        },
      ],
    });

    expect(filterAppleScreenshotLocalizationsByLocaleMock).toHaveBeenCalledWith(
      [{ id: "loc-en", attributes: { locale: "en-US" } }],
      "en-US",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Pulled apple screenshots en-US/APP_IPHONE_65 (0 files)",
    );
  });

  it("pulls Google screenshots through a read-only edit session", async () => {
    mockSharedConfig("google");
    createGooglePlayClientMock.mockReturnValueOnce({ id: "google-client" });
    expandGoogleScreenshotPullLocalesMock.mockReturnValueOnce(["en-US"]);
    withGoogleEditSessionMock.mockImplementationOnce(
      async (_client, _packageName, run, options) => {
        expect(options).toEqual({ autoCommit: false });
        return {
          edit: { id: "edit-1" },
          result: await run({ id: "edit-1" }),
        };
      },
    );
    listGoogleImagesForLocalesAndTypesMock.mockResolvedValueOnce([
      { locale: "en-US", imageType: "phoneScreenshots", images: [] },
    ]);
    downloadGoogleScreenshotSetMock.mockResolvedValueOnce({
      platform: "google",
      locale: "en-US",
      assetType: "phoneScreenshots",
      files: [],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runScreenshotsPullCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "google",
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "google/en-US/phoneScreenshots",
          success: true,
          message: "Pulled 0 screenshots",
        },
      ],
    });

    expect(listGoogleImagesForLocalesAndTypesMock).toHaveBeenCalledWith(
      { id: "google-client" },
      "com.example.demo",
      "edit-1",
      ["en-US"],
      [
        "phoneScreenshots",
        "sevenInchScreenshots",
        "tenInchScreenshots",
        "tvScreenshots",
        "wearScreenshots",
      ],
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Pulled google screenshots en-US/phoneScreenshots (0 files)",
    );
  });
});
