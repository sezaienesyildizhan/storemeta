import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runMetadataDiffCommand } from "../../src/cli/metadata-diff.js";
import { runScreenshotsDiffCommand } from "../../src/cli/screenshots-diff.js";

async function createProject(): Promise<{ configPath: string; tempDir: string }> {
  const tempDir = await mkdtemp(join(tmpdir(), "storemeta-diff-"));
  const configPath = join(tempDir, "storemeta.yml");

  await writeFile(
    configPath,
    [
      "version: 1",
      "project:",
      "  name: Diff Test",
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

describe("runMetadataDiffCommand", () => {
  it("reports local, expected, missing, and extra metadata locales", async () => {
    const { configPath, tempDir } = await createProject();

    try {
      await mkdir(join(tempDir, "metadata", "apple"), { recursive: true });
      await mkdir(join(tempDir, "metadata", "google"), { recursive: true });
      await writeFile(join(tempDir, "metadata", "apple", "en-US.yml"), "locale: en-US\n");
      await writeFile(join(tempDir, "metadata", "apple", "de.yml"), "locale: de\n");
      await writeFile(join(tempDir, "metadata", "apple", "notes.txt"), "ignored\n");
      await writeFile(join(tempDir, "metadata", "google", "en_US.yaml"), "locale: en-US\n");
      await writeFile(join(tempDir, "metadata", "google", "tr-TR.md"), "locale: tr-TR\n");

      await expect(
        runMetadataDiffCommand({
          config: configPath,
          platform: "all",
        }),
      ).resolves.toMatchObject({
        status: "partial",
        successCount: 1,
        failureCount: 1,
        results: [
          {
            target: "metadata.apple",
            success: false,
            message:
              "local: de, en-US; expected: en-US, tr; missing: tr; extra: de",
          },
          {
            target: "metadata.google",
            success: true,
            message: "local: en-US, tr-TR; expected: en-US, tr-TR",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("reports missing metadata when platform directories do not exist", async () => {
    const { configPath, tempDir } = await createProject();

    try {
      await expect(
        runMetadataDiffCommand({
          config: configPath,
          platform: "apple",
        }),
      ).resolves.toMatchObject({
        status: "partial",
        successCount: 0,
        failureCount: 1,
        results: [
          {
            target: "metadata.apple",
            success: false,
            message: "local: none; expected: en-US, tr; missing: en-US, tr",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("runScreenshotsDiffCommand", () => {
  it("reports screenshot locales, set counts, and missing locales", async () => {
    const { configPath, tempDir } = await createProject();

    try {
      await mkdir(join(tempDir, "screenshots", "apple", "en_US", "APP_IPHONE_65"), {
        recursive: true,
      });
      await mkdir(join(tempDir, "screenshots", "apple", "de", "APP_IPHONE_65"), {
        recursive: true,
      });
      await mkdir(join(tempDir, "screenshots", "apple", "de", "APP_IPHONE_67"), {
        recursive: true,
      });
      await mkdir(
        join(tempDir, "screenshots", "google", "en_US", "phoneScreenshots"),
        {
          recursive: true,
        },
      );
      await mkdir(
        join(tempDir, "screenshots", "google", "tr-TR", "phoneScreenshots"),
        {
          recursive: true,
        },
      );

      await expect(
        runScreenshotsDiffCommand({
          config: configPath,
          platform: "all",
        }),
      ).resolves.toMatchObject({
        status: "partial",
        successCount: 1,
        failureCount: 1,
        results: [
          {
            target: "screenshots.apple",
            success: false,
            message:
              "local locales: de, en-US; sets: de:2, en-US:0; expected: en-US, tr; missing: tr",
          },
          {
            target: "screenshots.google",
            success: true,
            message:
              "local locales: en-US, tr-TR; sets: en-US:0, tr-TR:1; expected: en-US, tr-TR",
          },
        ],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
