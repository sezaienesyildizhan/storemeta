import { describe, expect, it } from "vitest";

import {
  parseMarkdownMetadataDocument,
  renderMarkdownMetadataScaffold,
  serializeMarkdownMetadataDocument,
} from "../../src/formats/markdown-metadata.js";

describe("parseMarkdownMetadataDocument", () => {
  it("parses Apple canonical headings and aliases into the internal model", () => {
    const raw = [
      "---",
      "locale: en_us",
      "platform: apple",
      "source: local",
      "x_note: kept out of uploads",
      "---",
      "",
      "# App Store Listing",
      "",
      "## Name",
      "",
      "Example App",
      "",
      "## promotional text",
      "",
      "A focused release.",
      "",
      "## Release Notes",
      "",
      "- Fixed timers",
      "- Improved sync",
      "",
    ].join("\n");

    expect(
      parseMarkdownMetadataDocument(raw, "apple", "/tmp/metadata/apple/en-US.md"),
    ).toEqual({
      locale: "en-US",
      app_name: "Example App",
      promotional_text: "A focused release.",
      whats_new: "- Fixed timers\n- Improved sync",
    });
  });

  it("preserves Google field content, internal blank lines, and deeper headings", () => {
    const raw = [
      "---",
      "locale: tr",
      "---",
      "",
      "# Google Play Listing",
      "",
      "## Description",
      "",
      "First paragraph.",
      "",
      "### Details",
      "",
      "- One",
      "- Two",
      "",
    ].join("\n");

    expect(
      parseMarkdownMetadataDocument(raw, "google", "/tmp/metadata/google/tr.md"),
    ).toEqual({
      locale: "tr",
      full_description: "First paragraph.\n\n### Details\n\n- One\n- Two",
    });
  });

  it.each([
    {
      name: "missing frontmatter",
      raw: "# Google Play Listing\n",
      message: /frontmatter must start/,
    },
    {
      name: "missing locale",
      raw: "---\nsource: local\n---\n",
      message: /missing required.*locale/,
    },
    {
      name: "unknown frontmatter key",
      raw: "---\nlocale: en-US\nnote: no\n---\n",
      message: /unknown frontmatter field.*note/,
    },
    {
      name: "empty reserved value",
      raw: "---\nlocale: en-US\nsource: ''\n---\n",
      message: /source.*non-empty string/,
    },
    {
      name: "platform mismatch",
      raw: "---\nlocale: en-US\nplatform: apple\n---\n",
      message: /platform frontmatter says "apple".*metadata\/google/,
    },
    {
      name: "filename mismatch",
      raw: "---\nlocale: tr\n---\n",
      message: /filename locale "en-US".*"tr"/,
    },
    {
      name: "unknown heading",
      raw: "---\nlocale: en-US\n---\n\n## Tagline\n\nHello\n",
      message: /unknown heading "Tagline"/,
    },
    {
      name: "duplicate alias heading",
      raw: "---\nlocale: en-US\n---\n\n## Title\n\nOne\n\n## App Name\n\nTwo\n",
      message: /duplicate heading "App Name"/,
    },
    {
      name: "freeform preamble",
      raw: "---\nlocale: en-US\n---\n\nNot a title.\n\n## Title\n\nExample\n",
      message: /unexpected content before/,
    },
  ])("rejects $name", ({ raw, message }) => {
    expect(() =>
      parseMarkdownMetadataDocument(
        raw,
        "google",
        "/tmp/metadata/google/en-US.md",
      ),
    ).toThrow(message);
  });

  it("drops empty sections instead of emitting empty metadata fields", () => {
    expect(
      parseMarkdownMetadataDocument(
        "---\nlocale: en-US\n---\n\n# Google Play Listing\n\n## Title\n\n## Video\n",
        "google",
        "/tmp/metadata/google/en-US.md",
      ),
    ).toEqual({ locale: "en-US" });
  });
});

describe("serializeMarkdownMetadataDocument", () => {
  it("writes stable Apple Markdown in canonical order", () => {
    expect(
      serializeMarkdownMetadataDocument(
        "apple",
        {
          locale: "en_us",
          description: "First line.\r\n\r\nSecond line.",
          app_name: "Example App",
          support_url: "https://example.com/support",
        },
        {
          frontmatter: {
            platform: "apple",
            source: "pulled",
            fetchedAt: "2026-07-20T12:00:00.000Z",
          },
        },
      ),
    ).toBe(
      [
        "---",
        "locale: en-US",
        "platform: apple",
        "source: pulled",
        "fetched_at: 2026-07-20T12:00:00.000Z",
        "---",
        "",
        "# App Store Listing",
        "",
        "## App Name",
        "",
        "Example App",
        "",
        "## Description",
        "",
        "First line.",
        "",
        "Second line.",
        "",
        "## Support URL",
        "",
        "https://example.com/support",
        "",
      ].join("\n"),
    );
  });

  it("renders all canonical headings for scaffold files", () => {
    expect(renderMarkdownMetadataScaffold("google", "tr_TR")).toBe(
      [
        "---",
        "locale: tr-TR",
        "---",
        "",
        "# Google Play Listing",
        "",
        "## Title",
        "",
        "## Short Description",
        "",
        "## Full Description",
        "",
        "## Video",
        "",
      ].join("\n"),
    );
  });
});
