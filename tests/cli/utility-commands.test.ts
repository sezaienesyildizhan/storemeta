import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runConfigDoctorCommand } from "../../src/cli/config-doctor.js";
import { runLocalesListCommand } from "../../src/cli/locales-list.js";

async function createConfigFile(): Promise<{ configPath: string; tempDir: string }> {
  const tempDir = await mkdtemp(join(tmpdir(), "storemeta-cli-"));
  const configPath = join(tempDir, "storemeta.yml");

  await writeFile(
    configPath,
    [
      "version: 1",
      "project:",
      "  name: Utility Test",
      "  defaultApp: example",
      "apps:",
      "  example:",
      "    metadata:",
      "      baseDir: metadata",
      "      format: yaml",
      "    screenshots:",
      "      baseDir: screenshots",
      "    apple:",
      '      appId: "1234567890"',
      "      credentials:",
      "        issuerIdEnv: APPLE_ISSUER_ID",
      "        keyIdEnv: APPLE_KEY_ID",
      "        privateKeyPathEnv: APPLE_PRIVATE_KEY_PATH",
      "      locales:",
      "        default:",
      "          - en_US",
      "          - tr",
      "    google:",
      "      packageName: com.example.app",
      "      credentials:",
      "        serviceAccountPathEnv: GOOGLE_SERVICE_ACCOUNT_PATH",
      "      locales:",
      "        default:",
      "          - en_US",
      "          - tr-TR",
      "",
    ].join("\n"),
  );

  return { configPath, tempDir };
}

describe("runConfigDoctorCommand", () => {
  it("summarizes resolved config and selected platforms", async () => {
    const { configPath, tempDir } = await createConfigFile();

    try {
      await expect(
        runConfigDoctorCommand({
          config: configPath,
          platform: "all",
        }),
      ).resolves.toMatchObject({
        status: "success",
        successCount: 5,
        failureCount: 0,
        results: [
          {
            target: "config",
            success: true,
            message: `Loaded ${configPath}`,
          },
          {
            target: "project",
            success: true,
            message: "Utility Test; default app example",
          },
          {
            target: "app.example",
            success: true,
            message: "Selected platforms: apple, google",
          },
          {
            target: "metadata.baseDir",
            success: true,
            message: "metadata",
          },
          {
            target: "screenshots.baseDir",
            success: true,
            message: "screenshots",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("runLocalesListCommand", () => {
  it("normalizes configured locales for all platforms", async () => {
    const { configPath, tempDir } = await createConfigFile();

    try {
      await expect(
        runLocalesListCommand({
          config: configPath,
          platform: "all",
        }),
      ).resolves.toMatchObject({
        status: "success",
        successCount: 2,
        failureCount: 0,
        results: [
          {
            target: "locales.apple",
            success: true,
            message: "en-US, tr",
          },
          {
            target: "locales.google",
            success: true,
            message: "en-US, tr-TR",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("can filter locales to one configured platform", async () => {
    const { configPath, tempDir } = await createConfigFile();

    try {
      await expect(
        runLocalesListCommand({
          config: configPath,
          platform: "google",
        }),
      ).resolves.toMatchObject({
        status: "success",
        successCount: 1,
        results: [
          {
            target: "locales.google",
            message: "en-US, tr-TR",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
