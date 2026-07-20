import { describe, expect, it } from "vitest";

import { StoremetaError } from "../../src/cli/errors.js";
import { validateBaseDirectoryPaths } from "../../src/config/validate-base-dirs.js";
import { validateCredentialEnvVarNames } from "../../src/config/validate-credential-env-names.js";
import { validateRequiredPlatformIdentifiers } from "../../src/config/validate-platform-identifiers.js";
import type { StoremetaConfig } from "../../src/config/types.js";

function createConfig(
  overrides?: Partial<StoremetaConfig["apps"][string]>,
): StoremetaConfig {
  return {
    version: 1,
    project: {
      name: "Example",
      defaultApp: "example",
    },
    apps: {
      example: {
        metadata: {
          baseDir: "metadata",
          format: "yaml",
        },
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
        google: {
          packageName: "com.example.app",
          credentials: {
            serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
          },
        },
        ...overrides,
      },
    },
  };
}

describe("validateBaseDirectoryPaths", () => {
  it("accepts safe relative base directories", () => {
    expect(() => validateBaseDirectoryPaths(createConfig())).not.toThrow();
  });

  it("rejects absolute and parent-traversing base directories", () => {
    expect(() =>
      validateBaseDirectoryPaths(
        createConfig({
          metadata: {
            baseDir: "../metadata",
            format: "yaml",
          },
          screenshots: {
            baseDir: "/tmp/screenshots",
          },
        }),
      ),
    ).toThrow(StoremetaError);

    expect(() =>
      validateBaseDirectoryPaths(
        createConfig({
          metadata: {
            baseDir: "../metadata",
            format: "yaml",
          },
          screenshots: {
            baseDir: "/tmp/screenshots",
          },
        }),
      ),
    ).toThrow(/metadata\.baseDir.*screenshots\.baseDir/);
  });
});

describe("validateCredentialEnvVarNames", () => {
  it("accepts shell-compatible credential environment variable names", () => {
    expect(() => validateCredentialEnvVarNames(createConfig())).not.toThrow();
  });

  it("reports invalid credential environment variable names across platforms", () => {
    expect(() =>
      validateCredentialEnvVarNames(
        createConfig({
          apple: {
            appId: "1234567890",
            credentials: {
              issuerIdEnv: "1APPLE_ISSUER_ID",
              keyIdEnv: "APPLE-KEY-ID",
              privateKeyPathEnv: "APPLE PRIVATE KEY PATH",
            },
          },
          google: {
            packageName: "com.example.app",
            credentials: {
              serviceAccountPathEnv: "GOOGLE.SERVICE.ACCOUNT",
            },
          },
        }),
      ),
    ).toThrow(
      /issuerIdEnv.*keyIdEnv.*privateKeyPathEnv.*serviceAccountPathEnv/,
    );
  });
});

describe("validateRequiredPlatformIdentifiers", () => {
  it("accepts configured Apple and Google identifiers", () => {
    expect(() => validateRequiredPlatformIdentifiers(createConfig())).not.toThrow();
  });

  it("requires at least one platform per app", () => {
    expect(() =>
      validateRequiredPlatformIdentifiers(
        createConfig({
          apple: undefined,
          google: undefined,
        }),
      ),
    ).toThrow(/at least one platform must be configured/);
  });

  it("rejects blank platform identifiers", () => {
    expect(() =>
      validateRequiredPlatformIdentifiers(
        createConfig({
          apple: {
            appId: " ",
            credentials: {
              issuerIdEnv: "APPLE_ISSUER_ID",
              keyIdEnv: "APPLE_KEY_ID",
              privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
            },
          },
          google: {
            packageName: "",
            credentials: {
              serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
            },
          },
        }),
      ),
    ).toThrow(/apple\.appId.*google\.packageName/);
  });
});
