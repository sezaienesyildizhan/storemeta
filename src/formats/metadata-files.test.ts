import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadMarkdownMetadataFile,
  loadYamlMetadataFile,
  loadYmlMetadataFile,
} from "./load-metadata.js";
import { serializeMetadataDocument } from "./serialize-metadata.js";
import { writeMetadataFile } from "../writers/write-metadata.js";

describe("metadata file loaders", () => {
  it("loads .yml metadata files", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const filePath = join(tempDir, "en-US.yml");

    await writeFile(filePath, "locale: en-US\ntitle: Example\n");

    try {
      await expect(loadYmlMetadataFile(filePath)).resolves.toMatchObject({
        path: filePath,
        parsed: {
          locale: "en-US",
          title: "Example",
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("loads .yaml metadata files", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const filePath = join(tempDir, "en-US.yaml");

    await writeFile(filePath, "locale: en-US\ntitle: Example\n");

    try {
      await expect(loadYamlMetadataFile(filePath)).resolves.toMatchObject({
        path: filePath,
        parsed: {
          locale: "en-US",
          title: "Example",
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("loads .md files as yaml metadata", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const filePath = join(tempDir, "en-US.md");

    await writeFile(filePath, "locale: en-US\ntitle: Example\n");

    try {
      await expect(loadMarkdownMetadataFile(filePath)).resolves.toMatchObject({
        path: filePath,
        parsed: {
          locale: "en-US",
          title: "Example",
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("serializeMetadataDocument", () => {
  it("sorts metadata keys deterministically", () => {
    expect(
      serializeMetadataDocument({
        title: "Example",
        locale: "en-US",
        nested: {
          zeta: 2,
          alpha: 1,
        },
      }),
    ).toBe(
      [
        "locale: en-US",
        "nested:",
        "  alpha: 1",
        "  zeta: 2",
        "title: Example",
        "",
      ].join("\n"),
    );
  });
});

describe("writeMetadataFile", () => {
  it("writes serialized metadata inside the target base directory", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "storemeta-"));

    try {
      const resolvedPath = await writeMetadataFile(
        tempDir,
        "metadata/apple/en-US.yml",
        {
          title: "Example",
          locale: "en-US",
        },
      );

      expect(resolvedPath).toBe(join(tempDir, "metadata/apple/en-US.yml"));
      await expect(readFile(resolvedPath, "utf8")).resolves.toBe(
        ["locale: en-US", "title: Example", ""].join("\n"),
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
