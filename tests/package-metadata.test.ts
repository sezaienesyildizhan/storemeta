import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface PackageMetadata {
  name: string;
  description: string;
  keywords: string[];
}

async function loadPackageMetadata(): Promise<PackageMetadata> {
  const contents = await readFile(join(process.cwd(), "package.json"), "utf8");

  return JSON.parse(contents) as PackageMetadata;
}

describe("npm package metadata", () => {
  it("describes the published CLI and its supported stores", async () => {
    const packageMetadata = await loadPackageMetadata();

    expect(packageMetadata.name).toBe("storemeta");
    expect(packageMetadata.description).toContain("App Store Connect");
    expect(packageMetadata.description).toContain("Google Play");
    expect(packageMetadata.description).toContain("metadata and screenshots");
  });

  it("includes focused, unique discovery keywords", async () => {
    const packageMetadata = await loadPackageMetadata();
    const requiredKeywords = [
      "cli",
      "app-store-connect",
      "app-store-metadata",
      "app-store-listing",
      "google-play",
      "google-play-metadata",
      "google-play-listing",
      "store-metadata",
      "store-listing",
      "localization",
      "screenshots",
      "aso",
    ];

    expect(packageMetadata.keywords).toEqual(
      expect.arrayContaining(requiredKeywords),
    );
    expect(new Set(packageMetadata.keywords).size).toBe(
      packageMetadata.keywords.length,
    );
  });
});
