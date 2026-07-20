import { describe, expect, it } from "vitest";

import { selectConfiguredApp } from "../../src/config/select-app.js";
import { resolveSelectedPlatforms } from "../../src/config/select-platforms.js";

describe("selectConfiguredApp", () => {
  it("returns the default configured app when no explicit app id is provided", () => {
    expect(
      selectConfiguredApp({
        version: 1,
        project: {
          name: "Storemeta",
          defaultApp: "demo",
        },
        apps: {
          demo: {
            metadata: {
              baseDir: "metadata",
              format: "yaml",
            },
            screenshots: {
              baseDir: "screenshots",
            },
          },
        },
      }),
    ).toEqual({
      id: "demo",
      settings: {
        metadata: {
          baseDir: "metadata",
          format: "yaml",
        },
        screenshots: {
          baseDir: "screenshots",
        },
      },
    });
  });

  it("fails when the selected app id does not exist", () => {
    expect(() =>
      selectConfiguredApp(
        {
          version: 1,
          project: {
            name: "Storemeta",
            defaultApp: "demo",
          },
          apps: {},
        },
        "missing",
      ),
    ).toThrow(/Configured app "missing" was not found/);
  });
});

describe("resolveSelectedPlatforms", () => {
  it("returns all configured platforms when no platform is selected", () => {
    expect(
      resolveSelectedPlatforms({
        id: "demo",
        settings: {
          metadata: {
            baseDir: "metadata",
            format: "yaml",
          },
          screenshots: {
            baseDir: "screenshots",
          },
          apple: {
            appId: "0000000000",
            credentials: {
              issuerIdEnv: "APPLE_ISSUER_ID",
              keyIdEnv: "APPLE_KEY_ID",
              privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
            },
          },
          google: {
            packageName: "com.example.demo",
            credentials: {
              serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
            },
          },
        },
      }),
    ).toEqual(["apple", "google"]);
  });

  it("fails when a platform is requested but not configured", () => {
    expect(() =>
      resolveSelectedPlatforms(
        {
          id: "demo",
          settings: {
            metadata: {
              baseDir: "metadata",
              format: "yaml",
            },
            screenshots: {
              baseDir: "screenshots",
            },
            apple: {
              appId: "0000000000",
              credentials: {
                issuerIdEnv: "APPLE_ISSUER_ID",
                keyIdEnv: "APPLE_KEY_ID",
                privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
              },
            },
          },
        },
        "google",
      ),
    ).toThrow(/does not support platform "google"/);
  });
});
