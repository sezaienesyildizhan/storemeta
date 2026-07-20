import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ConfiguredApp } from "../../../src/config/apps.js";
import { validateAppleMetadataDocument } from "../../../src/validation/metadata/apple.js";
import {
  validateGoogleMetadataDocument,
  validateGoogleMetadataLengthConstraints,
} from "../../../src/validation/metadata/google.js";
import { validateMetadataFiles } from "../../../src/validation/metadata/files.js";

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

describe("metadata document validation", () => {
  it("accepts valid Apple metadata and rejects unknown keys", () => {
    expect(
      validateAppleMetadataDocument({
        locale: "en-US",
        app_name: "Example App",
        support_url: "https://example.com/support",
      }),
    ).toMatchObject({
      locale: "en-US",
      app_name: "Example App",
    });

    expect(() =>
      validateAppleMetadataDocument({
        locale: "en-US",
        title: "Google-only field",
      }),
    ).toThrow(/Apple metadata validation failed.*title/);
  });

  it("accepts valid Google metadata and rejects malformed URLs", () => {
    expect(
      validateGoogleMetadataDocument({
        locale: "en-US",
        title: "Example App",
        video: "https://example.com/video",
      }),
    ).toMatchObject({
      locale: "en-US",
      title: "Example App",
    });

    expect(() =>
      validateGoogleMetadataDocument({
        locale: "en-US",
        video: "not a url",
      }),
    ).toThrow(/Google metadata validation failed.*video/);
  });

  it("counts Unicode code points for Google metadata limits", () => {
    expect(() =>
      validateGoogleMetadataLengthConstraints({
        locale: "en-US",
        title: "🚀".repeat(30),
        short_description: "a".repeat(80),
        full_description: "b".repeat(4000),
      }),
    ).not.toThrow();

    expect(() =>
      validateGoogleMetadataLengthConstraints({
        locale: "en-US",
        title: "🚀".repeat(31),
        short_description: "a".repeat(81),
        full_description: "b".repeat(4001),
      }),
    ).toThrow(/title.*short_description.*full_description/);
  });
});

describe("validateMetadataFiles", () => {
  it("validates all supported metadata files and ignores unrelated extensions", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-metadata-"));

    try {
      await mkdir(join(tempDir, "metadata", "apple"), { recursive: true });
      await mkdir(join(tempDir, "metadata", "google"), { recursive: true });
      await writeFile(
        join(tempDir, "metadata", "apple", "en-US.yml"),
        [
          "locale: en-US",
          "app_name: Example App",
          "support_url: https://example.com/support",
          "",
        ].join("\n"),
      );
      await writeFile(
        join(tempDir, "metadata", "google", "en-US.yaml"),
        [
          "locale: en-US",
          "title: Example App",
          "short_description: Short description",
          "",
        ].join("\n"),
      );
      await writeFile(
        join(tempDir, "metadata", "google", "notes.txt"),
        "not metadata",
      );

      await expect(
        validateMetadataFiles(join(tempDir, "storemeta.yml"), createApp(), [
          "apple",
          "google",
        ]),
      ).resolves.toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when a supported metadata file violates platform validation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-metadata-"));

    try {
      await mkdir(join(tempDir, "metadata", "google"), { recursive: true });
      await writeFile(
        join(tempDir, "metadata", "google", "en-US.yml"),
        ["locale: en-US", `title: ${"a".repeat(31)}`, ""].join("\n"),
      );

      await expect(
        validateMetadataFiles(join(tempDir, "storemeta.yml"), createApp(), [
          "google",
        ]),
      ).rejects.toThrow(/Google metadata length validation failed.*title/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
