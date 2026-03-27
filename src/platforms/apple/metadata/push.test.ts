import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAppleMetadataDocuments } from "./push.js";

describe("loadAppleMetadataDocuments", () => {
  it("loads and validates Apple metadata documents from the canonical directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(
      join(appleMetadataDirectory, "tr.yml"),
      "locale: tr\napp_name: Ornek\n",
    );
    await writeFile(
      join(appleMetadataDirectory, "en-US.yaml"),
      "locale: en-US\napp_name: Example App\n",
    );

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([
        {
          locale: "en-US",
          app_name: "Example App",
        },
        {
          locale: "tr",
          app_name: "Ornek",
        },
      ]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });

  it("ignores unsupported file extensions in the Apple metadata directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(join(appleMetadataDirectory, "notes.txt"), "ignore me");

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });
});
