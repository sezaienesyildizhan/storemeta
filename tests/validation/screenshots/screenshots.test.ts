import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ConfiguredApp } from "../../../src/config/apps.js";
import { validateScreenshotFileExtensions } from "../../../src/validation/screenshots/extensions.js";
import { listScreenshotFileGroups, listScreenshotFiles } from "../../../src/validation/screenshots/files.js";
import { validateScreenshotFolderStructure } from "../../../src/validation/screenshots/folders.js";
import { validateScreenshotFileOrdering } from "../../../src/validation/screenshots/order.js";

function createApp(): ConfiguredApp {
  return {
    id: "example",
    settings: {
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
    },
  };
}

async function createScreenshotFile(
  root: string,
  platform: "apple" | "google",
  locale: string,
  assetType: string,
  fileName: string,
): Promise<string> {
  const directory = join(root, "screenshots", platform, locale, assetType);
  await mkdir(directory, { recursive: true });
  const filePath = join(directory, fileName);
  await writeFile(filePath, "fake image");
  return filePath;
}

describe("screenshot file discovery", () => {
  it("returns deterministic screenshot groups and files", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-screenshots-"));

    try {
      const second = await createScreenshotFile(
        tempDir,
        "apple",
        "en-US",
        "APP_IPHONE_65",
        "2.png",
      );
      const first = await createScreenshotFile(
        tempDir,
        "apple",
        "en-US",
        "APP_IPHONE_65",
        "1.png",
      );

      await expect(
        listScreenshotFileGroups(join(tempDir, "storemeta.yml"), createApp(), [
          "apple",
        ]),
      ).resolves.toEqual([
        {
          directory: join(
            tempDir,
            "screenshots",
            "apple",
            "en-US",
            "APP_IPHONE_65",
          ),
          files: [first, second],
        },
      ]);

      await expect(
        listScreenshotFiles(join(tempDir, "storemeta.yml"), createApp(), [
          "apple",
        ]),
      ).resolves.toEqual([first, second]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("screenshot validation", () => {
  it("accepts supported screenshot extensions case-insensitively", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-screenshots-"));

    try {
      await createScreenshotFile(
        tempDir,
        "google",
        "en-US",
        "phoneScreenshots",
        "1.PNG",
      );
      await createScreenshotFile(
        tempDir,
        "google",
        "en-US",
        "phoneScreenshots",
        "2.Jpeg",
      );

      await expect(
        validateScreenshotFileExtensions(
          join(tempDir, "storemeta.yml"),
          createApp(),
          ["google"],
        ),
      ).resolves.toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects unsupported screenshot extensions", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-screenshots-"));

    try {
      await createScreenshotFile(
        tempDir,
        "google",
        "en-US",
        "phoneScreenshots",
        "1.gif",
      );

      await expect(
        validateScreenshotFileExtensions(
          join(tempDir, "storemeta.yml"),
          createApp(),
          ["google"],
        ),
      ).rejects.toThrow(/unsupported screenshot file extension/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects files where locale or asset type directories are expected", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-screenshots-"));

    try {
      await mkdir(join(tempDir, "screenshots", "apple"), { recursive: true });
      await writeFile(join(tempDir, "screenshots", "apple", "en-US"), "file");
      await mkdir(join(tempDir, "screenshots", "google", "en-US"), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, "screenshots", "google", "en-US", "phoneScreenshots"),
        "file",
      );

      await expect(
        validateScreenshotFolderStructure(
          join(tempDir, "storemeta.yml"),
          createApp(),
          ["apple", "google"],
        ),
      ).rejects.toThrow(
        /expected a locale directory.*expected an asset type directory/,
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects non-numeric and non-contiguous screenshot filenames", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-screenshots-"));

    try {
      await createScreenshotFile(
        tempDir,
        "apple",
        "en-US",
        "APP_IPHONE_65",
        "1.png",
      );
      await createScreenshotFile(
        tempDir,
        "apple",
        "en-US",
        "APP_IPHONE_65",
        "3.png",
      );
      await createScreenshotFile(
        tempDir,
        "apple",
        "en-US",
        "APP_IPHONE_65",
        "cover.png",
      );

      await expect(
        validateScreenshotFileOrdering(
          join(tempDir, "storemeta.yml"),
          createApp(),
          ["apple"],
        ),
      ).rejects.toThrow(/expected screenshot order 2.*expected a numeric filename/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
