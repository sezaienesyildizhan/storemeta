import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadGoogleScreenshotSets } from "./push.js";

describe("loadGoogleScreenshotSets", () => {
  it("loads normalized Google screenshot sets from the canonical directory layout", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const screenshotDirectory = join(
      screenshotsBaseDir,
      "google",
      "en_us",
      "phoneScreenshots",
    );

    await mkdir(screenshotDirectory, { recursive: true });
    await writeFile(join(screenshotDirectory, "1.png"), "first");
    await writeFile(join(screenshotDirectory, "2.jpg"), "second");

    try {
      await expect(loadGoogleScreenshotSets(screenshotsBaseDir)).resolves.toEqual([
        {
          platform: "google",
          locale: "en-US",
          assetType: "phoneScreenshots",
          files: [
            {
              platform: "google",
              locale: "en-US",
              assetType: "phoneScreenshots",
              filePath: join(screenshotDirectory, "1.png"),
              fileName: "1.png",
              position: 1,
            },
            {
              platform: "google",
              locale: "en-US",
              assetType: "phoneScreenshots",
              filePath: join(screenshotDirectory, "2.jpg"),
              fileName: "2.jpg",
              position: 2,
            },
          ],
        },
      ]);
    } finally {
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });

  it("rejects unsupported Google screenshot asset types", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const screenshotDirectory = join(
      screenshotsBaseDir,
      "google",
      "en-US",
      "featureGraphic",
    );

    await mkdir(screenshotDirectory, { recursive: true });

    try {
      await expect(loadGoogleScreenshotSets(screenshotsBaseDir)).rejects.toThrow(
        /unsupported Google screenshot image type/,
      );
    } finally {
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });

  it("rejects non-numeric screenshot file names", async () => {
    const screenshotsBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const screenshotDirectory = join(
      screenshotsBaseDir,
      "google",
      "en-US",
      "phoneScreenshots",
    );

    await mkdir(screenshotDirectory, { recursive: true });
    await writeFile(join(screenshotDirectory, "cover.png"), "first");

    try {
      await expect(loadGoogleScreenshotSets(screenshotsBaseDir)).rejects.toThrow(
        /expected a numeric filename/,
      );
    } finally {
      await rm(screenshotsBaseDir, { recursive: true, force: true });
    }
  });
});
