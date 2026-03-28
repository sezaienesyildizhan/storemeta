import { access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInitCommand } from "./init.js";
import { runValidateCommand } from "./validate.js";

const createdPaths: string[] = [];

afterEach(async () => {
  while (createdPaths.length > 0) {
    const createdPath = createdPaths.pop();

    if (createdPath !== undefined) {
      await rm(createdPath, { recursive: true, force: true });
    }
  }

  delete process.env.STORE_APPLE_ISSUER_ID;
  delete process.env.STORE_APPLE_KEY_ID;
  delete process.env.STORE_APPLE_PRIVATE_KEY_PATH;
  delete process.env.STORE_GOOGLE_SERVICE_ACCOUNT_PATH;
});

describe("command smoke tests", () => {
  it("initializes a starter project layout", async () => {
    const projectPath = join(
      tmpdir(),
      `storemeta-smoke-init-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const configPath = join(projectPath, "storemeta.yml");
    createdPaths.push(projectPath);

    await expect(runInitCommand(configPath)).resolves.toBe(configPath);
    await expect(access(configPath)).resolves.toBeUndefined();
    await expect(
      access(join(projectPath, "metadata", "apple")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(projectPath, "metadata", "google")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(projectPath, "screenshots", "apple", "en-US", "APP_IPHONE_65")),
    ).resolves.toBeUndefined();
    await expect(
      access(
        join(projectPath, "screenshots", "google", "en-US", "phoneScreenshots"),
      ),
    ).resolves.toBeUndefined();
  });

  it("validates the initialized starter project successfully", async () => {
    const projectPath = join(
      tmpdir(),
      `storemeta-smoke-validate-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const configPath = join(projectPath, "storemeta.yml");
    createdPaths.push(projectPath);

    process.env.STORE_APPLE_ISSUER_ID = "issuer-id";
    process.env.STORE_APPLE_KEY_ID = "key-id";
    process.env.STORE_APPLE_PRIVATE_KEY_PATH = "/tmp/apple-key.p8";
    process.env.STORE_GOOGLE_SERVICE_ACCOUNT_PATH = "/tmp/google-service-account.json";

    await runInitCommand(configPath);

    await expect(
      runValidateCommand({
        config: configPath,
        platform: "all",
      }),
    ).resolves.toEqual({
      status: "success",
      successCount: 8,
      failureCount: 0,
      skippedCount: 0,
      results: [
        {
          target: "config.root",
          success: true,
          message: "Root config schema is valid",
        },
        {
          target: "app.example-app",
          success: true,
          message: "Selected platforms: apple, google",
        },
        {
          target: "credentials.apple",
          success: true,
          message: "Credentials are present",
        },
        {
          target: "credentials.google",
          success: true,
          message: "Credentials are present",
        },
        {
          target: "metadata",
          success: true,
          message: "Metadata files passed validation",
        },
        {
          target: "screenshots.structure",
          success: true,
          message: "Screenshot folder structure is valid",
        },
        {
          target: "screenshots.extensions",
          success: true,
          message: "Screenshot file extensions are supported",
        },
        {
          target: "screenshots.order",
          success: true,
          message: "Screenshot filenames are numbered correctly",
        },
      ],
    });
  });
});
