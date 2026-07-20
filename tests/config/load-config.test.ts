import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfigFile } from "../../src/config/load-config.js";
import { validateRootConfig } from "../../src/config/schema.js";
import { validateBaseDirectoryPaths } from "../../src/config/validate-base-dirs.js";
import { validateCredentialEnvVarNames } from "../../src/config/validate-credential-env-names.js";
import { validateRequiredPlatformIdentifiers } from "../../src/config/validate-platform-identifiers.js";

describe("loadConfigFile", () => {
  it("loads and parses a storemeta yaml file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const configPath = join(tempDir, "storemeta.yml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "project:",
        "  name: Storemeta",
        "  defaultApp: demo",
        "apps:",
        "  demo:",
        "    metadata:",
        "      baseDir: metadata",
        "      format: yaml",
        "    screenshots:",
        "      baseDir: screenshots",
        "    apple:",
        '      appId: "0000000000"',
        "      credentials:",
        "        issuerIdEnv: APPLE_ISSUER_ID",
        "        keyIdEnv: APPLE_KEY_ID",
        "        privateKeyPathEnv: APPLE_PRIVATE_KEY_PATH",
      ].join("\n"),
    );

    try {
      await expect(loadConfigFile(configPath)).resolves.toMatchObject({
        path: configPath,
        parsed: {
          version: 1,
          project: {
            name: "Storemeta",
            defaultApp: "demo",
          },
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when the config yaml is invalid", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const configPath = join(tempDir, "storemeta.yml");

    await writeFile(configPath, "version: [");

    try {
      await expect(loadConfigFile(configPath)).rejects.toThrow(
        /Failed to parse YAML config/,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("validateRootConfig", () => {
  it("accepts a valid root config", () => {
    expect(
      validateRootConfig({
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
            google: {
              packageName: "com.example.demo",
              credentials: {
                serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
              },
            },
          },
        },
      }),
    ).toMatchObject({
      version: 1,
      project: {
        defaultApp: "demo",
      },
    });
  });

  it("rejects configs with unknown keys", () => {
    expect(() =>
      validateRootConfig({
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
            extra: true,
          },
        },
      }),
    ).toThrow(/Config schema validation failed/);
  });
});

describe("config validators", () => {
  it("rejects unsafe base directories", () => {
    expect(() =>
      validateBaseDirectoryPaths({
        version: 1,
        project: {
          name: "Storemeta",
          defaultApp: "demo",
        },
        apps: {
          demo: {
            metadata: {
              baseDir: "../metadata",
              format: "yaml",
            },
            screenshots: {
              baseDir: "screenshots",
            },
          },
        },
      }),
    ).toThrow(/Base directory validation failed/);
  });

  it("rejects missing platform identifiers", () => {
    expect(() =>
      validateRequiredPlatformIdentifiers({
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
    ).toThrow(/Platform identifier validation failed/);
  });

  it("rejects invalid credential env var names", () => {
    expect(() =>
      validateCredentialEnvVarNames({
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
            apple: {
              appId: "0000000000",
              credentials: {
                issuerIdEnv: "APPLE-ISSUER-ID",
                keyIdEnv: "APPLE_KEY_ID",
                privateKeyPathEnv: "APPLE_PRIVATE_KEY_PATH",
              },
            },
          },
        },
      }),
    ).toThrow(/Credential environment variable validation failed/);
  });
});
