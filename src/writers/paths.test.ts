import { describe, expect, it } from "vitest";

import {
  assertPathWithinBaseDir,
  resolvePathWithinBaseDir,
} from "./resolve-within-base-dir.js";
import {
  resolveScreenshotFilePath,
  resolveScreenshotSetDirectory,
} from "./resolve-screenshot-path.js";

describe("assertPathWithinBaseDir", () => {
  it("accepts paths that remain within the base directory", () => {
    expect(
      assertPathWithinBaseDir("/tmp/storemeta", "/tmp/storemeta/apple/en-US.yml"),
    ).toBe("/tmp/storemeta/apple/en-US.yml");
  });

  it("rejects paths that escape the base directory", () => {
    expect(() =>
      assertPathWithinBaseDir("/tmp/storemeta", "/tmp/outside/en-US.yml"),
    ).toThrow(/Resolved path escapes base directory/);
  });
});

describe("resolvePathWithinBaseDir", () => {
  it("resolves joined paths inside the base directory", () => {
    expect(
      resolvePathWithinBaseDir("/tmp/storemeta", "metadata", "apple", "en-US.yml"),
    ).toBe("/tmp/storemeta/metadata/apple/en-US.yml");
  });
});

describe("resolveScreenshotSetDirectory", () => {
  it("normalizes locale codes when resolving screenshot directories", () => {
    expect(
      resolveScreenshotSetDirectory("/tmp/storemeta/screenshots", {
        platform: "apple",
        locale: "en_us",
        assetType: "APP_IPHONE_65",
      }),
    ).toBe("/tmp/storemeta/screenshots/apple/en-US/APP_IPHONE_65");
  });
});

describe("resolveScreenshotFilePath", () => {
  it("resolves normalized screenshot file paths safely", () => {
    expect(
      resolveScreenshotFilePath("/tmp/storemeta/screenshots", {
        platform: "google",
        locale: "tr_tr",
        assetType: "phoneScreenshots",
        fileName: "1.png",
      }),
    ).toBe("/tmp/storemeta/screenshots/google/tr-TR/phoneScreenshots/1.png");
  });
});
