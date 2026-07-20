import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAuthCheckCommand } from "../../src/cli/auth-check.js";

async function createConfigFile(): Promise<{ configPath: string; tempDir: string }> {
  const tempDir = await mkdtemp(join(tmpdir(), "storemeta-auth-"));
  const configPath = join(tempDir, "storemeta.yml");

  await writeFile(
    configPath,
    [
      "version: 1",
      "project:",
      "  name: Auth Test",
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
      "    google:",
      "      packageName: com.example.app",
      "      credentials:",
      "        serviceAccountPathEnv: GOOGLE_SERVICE_ACCOUNT_PATH",
      "",
    ].join("\n"),
  );

  return { configPath, tempDir };
}

afterEach(() => {
  delete process.env.APPLE_ISSUER_ID;
  delete process.env.APPLE_KEY_ID;
  delete process.env.APPLE_PRIVATE_KEY_PATH;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
});

describe("runAuthCheckCommand", () => {
  it("reports missing credential environment variables without exposing values", async () => {
    const { configPath, tempDir } = await createConfigFile();

    try {
      process.env.APPLE_ISSUER_ID = "issuer";

      await expect(
        runAuthCheckCommand({
          config: configPath,
          platform: "all",
        }),
      ).resolves.toMatchObject({
        status: "failure",
        successCount: 0,
        failureCount: 2,
        results: [
          {
            target: "auth.apple",
            success: false,
            message:
              "Missing Apple credential environment variables: APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH",
          },
          {
            target: "auth.google",
            success: false,
            message:
              "Missing Google credential environment variable: GOOGLE_SERVICE_ACCOUNT_PATH",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("reports success when selected platform credentials are present", async () => {
    const { configPath, tempDir } = await createConfigFile();

    try {
      process.env.GOOGLE_SERVICE_ACCOUNT_PATH = "/tmp/service-account.json";

      await expect(
        runAuthCheckCommand({
          config: configPath,
          platform: "google",
        }),
      ).resolves.toMatchObject({
        status: "success",
        successCount: 1,
        failureCount: 0,
        results: [
          {
            target: "auth.google",
            success: true,
            message: "Google credential environment variables are present",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
