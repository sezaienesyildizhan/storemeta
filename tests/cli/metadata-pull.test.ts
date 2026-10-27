import { beforeEach, describe, expect, it, vi } from "vitest";

import { runMetadataPullCommand } from "../../src/cli/metadata-pull.js";

const {
  loadConfigFileMock,
  validateRootConfigMock,
  selectConfiguredAppMock,
  resolveSelectedPlatformsMock,
  createAppStoreConnectClientMock,
  fetchAppleAppInfoLocalizationsMock,
  fetchAppleAppStoreVersionLocalizationsMock,
  mergeAppleLocalizationsMock,
  normalizeMergedAppleLocalizationsMock,
  writeAppleMetadataDocumentsMock,
  createGooglePlayClientMock,
  withGoogleEditSessionMock,
  fetchGoogleListingsForLocalesMock,
  normalizeGoogleListingMock,
  writeGoogleListingDocumentsMock,
} = vi.hoisted(() => ({
  loadConfigFileMock: vi.fn(),
  validateRootConfigMock: vi.fn(),
  selectConfiguredAppMock: vi.fn(),
  resolveSelectedPlatformsMock: vi.fn(),
  createAppStoreConnectClientMock: vi.fn(),
  fetchAppleAppInfoLocalizationsMock: vi.fn(),
  fetchAppleAppStoreVersionLocalizationsMock: vi.fn(),
  mergeAppleLocalizationsMock: vi.fn(),
  normalizeMergedAppleLocalizationsMock: vi.fn(),
  writeAppleMetadataDocumentsMock: vi.fn(),
  createGooglePlayClientMock: vi.fn(),
  withGoogleEditSessionMock: vi.fn(),
  fetchGoogleListingsForLocalesMock: vi.fn(),
  normalizeGoogleListingMock: vi.fn(),
  writeGoogleListingDocumentsMock: vi.fn(),
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

vi.mock("../../src/platforms/apple/metadata/pull.js", () => ({
  fetchAppleAppInfoLocalizations: fetchAppleAppInfoLocalizationsMock,
  fetchAppleAppStoreVersionLocalizations:
    fetchAppleAppStoreVersionLocalizationsMock,
  mergeAppleLocalizations: mergeAppleLocalizationsMock,
  normalizeMergedAppleLocalizations: normalizeMergedAppleLocalizationsMock,
  writeAppleMetadataDocuments: writeAppleMetadataDocumentsMock,
}));

vi.mock("../../src/platforms/google/client.js", () => ({
  createGooglePlayClient: createGooglePlayClientMock,
}));

vi.mock("../../src/platforms/google/edits.js", () => ({
  withGoogleEditSession: withGoogleEditSessionMock,
}));

vi.mock("../../src/platforms/google/metadata/pull.js", () => ({
  fetchGoogleListingsForLocales: fetchGoogleListingsForLocalesMock,
  normalizeGoogleListing: normalizeGoogleListingMock,
  writeGoogleListingDocuments: writeGoogleListingDocumentsMock,
}));

beforeEach(() => {
  loadConfigFileMock.mockReset();
  validateRootConfigMock.mockReset();
  selectConfiguredAppMock.mockReset();
  resolveSelectedPlatformsMock.mockReset();
  createAppStoreConnectClientMock.mockReset();
  fetchAppleAppInfoLocalizationsMock.mockReset();
  fetchAppleAppStoreVersionLocalizationsMock.mockReset();
  mergeAppleLocalizationsMock.mockReset();
  normalizeMergedAppleLocalizationsMock.mockReset();
  writeAppleMetadataDocumentsMock.mockReset();
  createGooglePlayClientMock.mockReset();
  withGoogleEditSessionMock.mockReset();
  fetchGoogleListingsForLocalesMock.mockReset();
  normalizeGoogleListingMock.mockReset();
  writeGoogleListingDocumentsMock.mockReset();
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
        format: "markdown",
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
                default: ["en-US", "tr-TR"],
              },
            }
          : undefined,
    },
  });
  resolveSelectedPlatformsMock.mockReturnValueOnce([platform]);
}

function mockAppleDocuments(locales: string[]) {
  createAppStoreConnectClientMock.mockReturnValueOnce({ id: "apple-client" });
  fetchAppleAppInfoLocalizationsMock.mockResolvedValueOnce([]);
  fetchAppleAppStoreVersionLocalizationsMock.mockResolvedValueOnce([]);
  mergeAppleLocalizationsMock.mockReturnValueOnce([]);
  normalizeMergedAppleLocalizationsMock.mockReturnValueOnce(
    locales.map((locale) => ({ locale, app_name: "Demo" })),
  );
  writeAppleMetadataDocumentsMock.mockResolvedValueOnce([]);
}

describe("runMetadataPullCommand", () => {
  it("reports each pulled Apple locale in the command summary", async () => {
    mockSharedConfig("apple");
    mockAppleDocuments(["en-US", "tr"]);

    await expect(
      runMetadataPullCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 2,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "apple/en-US",
          success: true,
          message: "Pulled Apple metadata",
        },
        {
          target: "apple/tr",
          success: true,
          message: "Pulled Apple metadata",
        },
      ],
    });

    expect(writeAppleMetadataDocumentsMock).toHaveBeenCalledWith(
      "/tmp/metadata",
      [
        { locale: "en-US", app_name: "Demo" },
        { locale: "tr", app_name: "Demo" },
      ],
      "markdown",
      expect.any(String),
    );
  });

  it("returns an empty summary when no Apple locale matches the filter", async () => {
    mockSharedConfig("apple");
    mockAppleDocuments(["en-US"]);

    await expect(
      runMetadataPullCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "apple",
        locale: "de-DE",
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      results: [],
    });

    expect(writeAppleMetadataDocumentsMock).toHaveBeenCalledWith(
      "/tmp/metadata",
      [],
      "markdown",
      expect.any(String),
    );
  });

  it("reports pulled Google locales from a read-only edit session", async () => {
    mockSharedConfig("google");
    createGooglePlayClientMock.mockReturnValueOnce({ id: "google-client" });
    withGoogleEditSessionMock.mockImplementationOnce(
      async (_client, _packageName, run, options) => {
        expect(options).toEqual({ autoCommit: false });
        return {
          edit: { id: "edit-1" },
          result: await run({ id: "edit-1" }),
        };
      },
    );
    fetchGoogleListingsForLocalesMock.mockResolvedValueOnce([
      { language: "en-US" },
      { language: "tr-TR" },
    ]);
    normalizeGoogleListingMock.mockImplementation(
      (listing: { language: string }) => ({
        locale: listing.language,
        title: "Demo",
      }),
    );
    writeGoogleListingDocumentsMock.mockResolvedValueOnce([]);

    await expect(
      runMetadataPullCommand({
        config: "storemeta.yml",
        app: "demo",
        platform: "google",
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 2,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "google/en-US",
          success: true,
          message: "Pulled Google metadata",
        },
        {
          target: "google/tr-TR",
          success: true,
          message: "Pulled Google metadata",
        },
      ],
    });

    expect(fetchGoogleListingsForLocalesMock).toHaveBeenCalledWith(
      { id: "google-client" },
      "com.example.demo",
      "edit-1",
      ["en-US", "tr-TR"],
    );
  });
});
