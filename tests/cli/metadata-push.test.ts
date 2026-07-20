import { beforeEach, describe, expect, it, vi } from "vitest";

import { runMetadataPushCommand } from "../../src/cli/metadata-push.js";

const {
  loadConfigFileMock,
  validateRootConfigMock,
  selectConfiguredAppMock,
  resolveSelectedPlatformsMock,
  loadAppleMetadataDocumentsMock,
  loadGoogleMetadataDocumentsMock,
  mapGoogleMetadataDocumentsMock,
  createAppStoreConnectClientMock,
  createGooglePlayClientMock,
  resolveAppleAppInfoResourceMock,
  resolveEditableAppleAppStoreVersionResourceMock,
  updateExistingAppleAppInfoLocalizationsMock,
  createMissingAppleAppInfoLocalizationsMock,
  updateExistingAppleAppStoreVersionLocalizationsMock,
  createMissingAppleAppStoreVersionLocalizationsMock,
  withGoogleEditSessionMock,
  uploadGoogleListingsMock,
} = vi.hoisted(() => ({
  loadConfigFileMock: vi.fn(),
  validateRootConfigMock: vi.fn(),
  selectConfiguredAppMock: vi.fn(),
  resolveSelectedPlatformsMock: vi.fn(),
  loadAppleMetadataDocumentsMock: vi.fn(),
  loadGoogleMetadataDocumentsMock: vi.fn(),
  mapGoogleMetadataDocumentsMock: vi.fn(),
  createAppStoreConnectClientMock: vi.fn(),
  createGooglePlayClientMock: vi.fn(),
  resolveAppleAppInfoResourceMock: vi.fn(),
  resolveEditableAppleAppStoreVersionResourceMock: vi.fn(),
  updateExistingAppleAppInfoLocalizationsMock: vi.fn(),
  createMissingAppleAppInfoLocalizationsMock: vi.fn(),
  updateExistingAppleAppStoreVersionLocalizationsMock: vi.fn(),
  createMissingAppleAppStoreVersionLocalizationsMock: vi.fn(),
  withGoogleEditSessionMock: vi.fn(),
  uploadGoogleListingsMock: vi.fn(),
}));

vi.mock("../../src/config/load-config.js", () => ({
  loadConfigFile: loadConfigFileMock,
}));

vi.mock("../../src/config/schema.js", () => ({
  validateRootConfig: validateRootConfigMock,
}));

vi.mock("../../src/config/select-app.js", () => ({
  selectConfiguredApp: selectConfiguredAppMock,
}));

vi.mock("../../src/config/select-platforms.js", () => ({
  resolveSelectedPlatforms: resolveSelectedPlatformsMock,
}));

vi.mock("../../src/platforms/apple/client.js", () => ({
  createAppStoreConnectClient: createAppStoreConnectClientMock,
}));

vi.mock("../../src/platforms/apple/metadata/push.js", () => ({
  loadAppleMetadataDocuments: loadAppleMetadataDocumentsMock,
  resolveAppleAppInfoResource: resolveAppleAppInfoResourceMock,
  resolveEditableAppleAppStoreVersionResource:
    resolveEditableAppleAppStoreVersionResourceMock,
  updateExistingAppleAppInfoLocalizations:
    updateExistingAppleAppInfoLocalizationsMock,
  createMissingAppleAppInfoLocalizations:
    createMissingAppleAppInfoLocalizationsMock,
  updateExistingAppleAppStoreVersionLocalizations:
    updateExistingAppleAppStoreVersionLocalizationsMock,
  createMissingAppleAppStoreVersionLocalizations:
    createMissingAppleAppStoreVersionLocalizationsMock,
}));

vi.mock("../../src/platforms/google/client.js", () => ({
  createGooglePlayClient: createGooglePlayClientMock,
}));

vi.mock("../../src/platforms/google/edits.js", () => ({
  withGoogleEditSession: withGoogleEditSessionMock,
}));

vi.mock("../../src/platforms/google/metadata/push.js", () => ({
  loadGoogleMetadataDocuments: loadGoogleMetadataDocumentsMock,
  mapGoogleMetadataDocuments: mapGoogleMetadataDocumentsMock,
  uploadGoogleListings: uploadGoogleListingsMock,
}));

beforeEach(() => {
  loadConfigFileMock.mockReset();
  validateRootConfigMock.mockReset();
  selectConfiguredAppMock.mockReset();
  resolveSelectedPlatformsMock.mockReset();
  loadAppleMetadataDocumentsMock.mockReset();
  loadGoogleMetadataDocumentsMock.mockReset();
  mapGoogleMetadataDocumentsMock.mockReset();
  createAppStoreConnectClientMock.mockReset();
  createGooglePlayClientMock.mockReset();
  resolveAppleAppInfoResourceMock.mockReset();
  resolveEditableAppleAppStoreVersionResourceMock.mockReset();
  updateExistingAppleAppInfoLocalizationsMock.mockReset();
  createMissingAppleAppInfoLocalizationsMock.mockReset();
  updateExistingAppleAppStoreVersionLocalizationsMock.mockReset();
  createMissingAppleAppStoreVersionLocalizationsMock.mockReset();
  withGoogleEditSessionMock.mockReset();
  uploadGoogleListingsMock.mockReset();
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
              appId: "0000000000",
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
            }
          : undefined,
    },
  });
  resolveSelectedPlatformsMock.mockReturnValueOnce([platform]);
}

describe("runMetadataPushCommand", () => {
  it("supports Apple metadata dry runs without touching remote clients", async () => {
    mockSharedConfig("apple");
    loadAppleMetadataDocumentsMock.mockResolvedValueOnce([
      {
        locale: "en-US",
        app_name: "Storemeta Example",
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runMetadataPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        locale: "en_us",
        dryRun: true,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "apple/en-US",
          success: true,
          message: "Would sync Apple metadata",
        },
      ],
    });

    expect(logSpy).toHaveBeenCalledWith("DRY RUN apple metadata en-US");
    expect(createAppStoreConnectClientMock).not.toHaveBeenCalled();
    expect(resolveAppleAppInfoResourceMock).not.toHaveBeenCalled();
    expect(resolveEditableAppleAppStoreVersionResourceMock).not.toHaveBeenCalled();
  });

  it("supports Google metadata dry runs without opening an edit session", async () => {
    mockSharedConfig("google");
    loadGoogleMetadataDocumentsMock.mockResolvedValueOnce([
      {
        locale: "tr",
        title: "Storemeta Ornek",
      },
    ]);
    mapGoogleMetadataDocumentsMock.mockReturnValueOnce([
      {
        language: "tr",
        body: {
          title: "Storemeta Ornek",
        },
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runMetadataPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "google",
        dryRun: true,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "google/tr",
          success: true,
          message: "Would upload listing metadata",
        },
      ],
    });

    expect(logSpy).toHaveBeenCalledWith("DRY RUN google metadata tr");
    expect(createGooglePlayClientMock).not.toHaveBeenCalled();
    expect(withGoogleEditSessionMock).not.toHaveBeenCalled();
    expect(uploadGoogleListingsMock).not.toHaveBeenCalled();
  });

  it("runs the Apple metadata push flow through the mocked API helpers", async () => {
    mockSharedConfig("apple");
    loadAppleMetadataDocumentsMock.mockResolvedValueOnce([
      {
        locale: "en-US",
        app_name: "Storemeta Example",
      },
    ]);
    createAppStoreConnectClientMock.mockReturnValueOnce({ id: "apple-client" });
    resolveAppleAppInfoResourceMock.mockResolvedValueOnce({ id: "app-info-1" });
    resolveEditableAppleAppStoreVersionResourceMock.mockResolvedValueOnce({
      id: "version-1",
    });
    updateExistingAppleAppInfoLocalizationsMock.mockResolvedValueOnce([]);
    createMissingAppleAppInfoLocalizationsMock.mockResolvedValueOnce([]);
    updateExistingAppleAppStoreVersionLocalizationsMock.mockResolvedValueOnce([]);
    createMissingAppleAppStoreVersionLocalizationsMock.mockResolvedValueOnce([]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      runMetadataPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        dryRun: false,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "apple/en-US",
          success: true,
          message: "Synced Apple metadata",
        },
      ],
    });

    expect(logSpy).toHaveBeenNthCalledWith(1, "Syncing apple metadata en-US");
    expect(logSpy).toHaveBeenNthCalledWith(2, "Synced apple metadata en-US");
    expect(resolveAppleAppInfoResourceMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "0000000000",
    );
    expect(resolveEditableAppleAppStoreVersionResourceMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "0000000000",
    );
    expect(updateExistingAppleAppInfoLocalizationsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "app-info-1",
      [
        {
          locale: "en-US",
          app_name: "Storemeta Example",
        },
      ],
    );
    expect(createMissingAppleAppInfoLocalizationsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "app-info-1",
      [
        {
          locale: "en-US",
          app_name: "Storemeta Example",
        },
      ],
    );
    expect(updateExistingAppleAppStoreVersionLocalizationsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "version-1",
      [
        {
          locale: "en-US",
          app_name: "Storemeta Example",
        },
      ],
    );
    expect(createMissingAppleAppStoreVersionLocalizationsMock).toHaveBeenCalledWith(
      { id: "apple-client" },
      "version-1",
      [
        {
          locale: "en-US",
          app_name: "Storemeta Example",
        },
      ],
    );
  });

  it("runs the Google metadata push flow through the mocked API helpers", async () => {
    mockSharedConfig("google");
    loadGoogleMetadataDocumentsMock.mockResolvedValueOnce([
      {
        locale: "tr",
        title: "Storemeta Ornek",
      },
    ]);
    mapGoogleMetadataDocumentsMock.mockReturnValueOnce([
      {
        language: "tr",
        body: {
          title: "Storemeta Ornek",
        },
      },
    ]);
    createGooglePlayClientMock.mockReturnValueOnce({ id: "google-client" });
    withGoogleEditSessionMock.mockImplementationOnce(
      async (_client, _packageName, callback) =>
        callback({
          id: "edit-1",
        }),
    );

    await expect(
      runMetadataPushCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "google",
        dryRun: false,
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 1,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "google/tr",
          success: true,
          message: "Uploaded listing metadata",
        },
      ],
    });

    expect(withGoogleEditSessionMock).toHaveBeenCalledWith(
      { id: "google-client" },
      "com.example.demo",
      expect.any(Function),
    );
    expect(uploadGoogleListingsMock).toHaveBeenCalledWith(
      { id: "google-client" },
      "com.example.demo",
      "edit-1",
      [
        {
          language: "tr",
          body: {
            title: "Storemeta Ornek",
          },
        },
      ],
      {
        onUploaded: expect.any(Function),
      },
    );
  });
});
