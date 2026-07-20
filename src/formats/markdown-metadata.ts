import { basename, extname } from "node:path";

import YAML from "yaml";

import { StoremetaError } from "../cli/errors.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import type {
  AppleMetadataDocument,
  GoogleMetadataDocument,
  MetadataPlatform,
  PlatformMetadataDocument,
} from "./metadata-types.js";

interface FieldDefinition {
  heading: string;
  field: string;
  aliases?: string[];
}

const APPLE_FIELDS: FieldDefinition[] = [
  { heading: "App Name", field: "app_name", aliases: ["Name"] },
  { heading: "Subtitle", field: "subtitle" },
  { heading: "Promotional Text", field: "promotional_text" },
  { heading: "Description", field: "description" },
  { heading: "Keywords", field: "keywords" },
  {
    heading: "What's New",
    field: "whats_new",
    aliases: ["Release Notes", "Whats New", "What is New"],
  },
  { heading: "Support URL", field: "support_url" },
  { heading: "Marketing URL", field: "marketing_url" },
  {
    heading: "Privacy Policy URL",
    field: "privacy_policy_url",
    aliases: ["Privacy URL"],
  },
];

const GOOGLE_FIELDS: FieldDefinition[] = [
  { heading: "Title", field: "title", aliases: ["Name", "App Name"] },
  { heading: "Short Description", field: "short_description" },
  {
    heading: "Full Description",
    field: "full_description",
    aliases: ["Description"],
  },
  { heading: "Video", field: "video", aliases: ["Promo Video"] },
];

const RESERVED_FRONTMATTER_KEYS = new Set([
  "locale",
  "store_locale",
  "source",
  "fetched_at",
  "platform",
]);

export interface MarkdownMetadataFrontmatter {
  storeLocale?: string;
  source?: string;
  fetchedAt?: string;
  platform?: MetadataPlatform;
  extensions?: Record<string, unknown>;
}

export interface SerializeMarkdownMetadataOptions {
  frontmatter?: MarkdownMetadataFrontmatter;
  includeEmptyFields?: boolean;
}

function metadataError(filePath: string, message: string, cause?: unknown): never {
  throw new StoremetaError(
    "VALIDATION_ERROR",
    `${filePath}: ${message}`,
    cause === undefined ? undefined : { cause },
  );
}

function fieldsForPlatform(platform: MetadataPlatform): FieldDefinition[] {
  return platform === "apple" ? APPLE_FIELDS : GOOGLE_FIELDS;
}

function canonicalizeHeading(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createHeadingMap(platform: MetadataPlatform): Map<string, FieldDefinition> {
  const map = new Map<string, FieldDefinition>();

  for (const definition of fieldsForPlatform(platform)) {
    for (const heading of [definition.heading, ...(definition.aliases ?? [])]) {
      map.set(canonicalizeHeading(heading), definition);
    }
  }

  return map;
}

function parseFrontmatter(
  raw: string,
  platform: MetadataPlatform,
  filePath: string,
): { bodyLines: string[]; locale: string } {
  const normalizedRaw = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const lines = normalizedRaw.split("\n");

  if (lines[0] !== "---") {
    return metadataError(filePath, 'frontmatter must start with "---" on the first line');
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");

  if (closingIndex === -1) {
    return metadataError(filePath, 'frontmatter is missing its closing "---"');
  }

  let parsed: unknown;

  try {
    parsed = YAML.parse(lines.slice(1, closingIndex).join("\n"));
  } catch (cause) {
    return metadataError(filePath, "failed to parse YAML frontmatter", cause);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return metadataError(filePath, "frontmatter must be a YAML mapping");
  }

  const frontmatter = parsed as Record<string, unknown>;

  for (const [key, value] of Object.entries(frontmatter)) {
    if (!RESERVED_FRONTMATTER_KEYS.has(key) && !key.startsWith("x_")) {
      return metadataError(
        filePath,
        `unknown frontmatter field "${key}"; extension fields must start with "x_"`,
      );
    }

    if (RESERVED_FRONTMATTER_KEYS.has(key)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        return metadataError(filePath, `frontmatter field "${key}" must be a non-empty string`);
      }
    }
  }

  if (!("locale" in frontmatter)) {
    return metadataError(filePath, 'missing required frontmatter field "locale"');
  }

  const locale = normalizeLocaleCode(frontmatter.locale as string);

  if (locale.length === 0) {
    return metadataError(filePath, 'frontmatter field "locale" must be a non-empty string');
  }

  if (frontmatter.platform !== undefined && frontmatter.platform !== platform) {
    return metadataError(
      filePath,
      `platform frontmatter says "${frontmatter.platform}" but file is under metadata/${platform}`,
    );
  }

  const fileLocale = basename(filePath, extname(filePath));

  if (fileLocale !== locale) {
    return metadataError(
      filePath,
      `filename locale "${fileLocale}" does not match normalized frontmatter locale "${locale}"`,
    );
  }

  return {
    bodyLines: lines.slice(closingIndex + 1),
    locale,
  };
}

function trimBlankLineEdges(lines: string[]): string {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]!.trim().length === 0) {
    start += 1;
  }

  while (end > start && lines[end - 1]!.trim().length === 0) {
    end -= 1;
  }

  return lines.slice(start, end).join("\n");
}

export function parseMarkdownMetadataDocument(
  raw: string,
  platform: MetadataPlatform,
  filePath: string,
): PlatformMetadataDocument {
  const { bodyLines, locale } = parseFrontmatter(raw, platform, filePath);
  const headingMap = createHeadingMap(platform);
  const parsedFields: Record<string, string> = {};
  const seenFields = new Set<string>();
  let currentDefinition: FieldDefinition | undefined;
  let currentLines: string[] = [];
  let sawTitle = false;
  let sawField = false;

  const finishCurrentField = () => {
    if (currentDefinition === undefined) {
      return;
    }

    const value = trimBlankLineEdges(currentLines);

    if (value.length > 0) {
      parsedFields[currentDefinition.field] = value;
    }
  };

  for (const line of bodyLines) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(line);

    if (headingMatch !== null) {
      finishCurrentField();
      const heading = headingMatch[1]!;
      const definition = headingMap.get(canonicalizeHeading(heading));

      if (definition === undefined) {
        const expected = fieldsForPlatform(platform)
          .map((field) => field.heading)
          .join(", ");
        return metadataError(
          filePath,
          `unknown heading "${heading}"; expected ${expected}`,
        );
      }

      if (seenFields.has(definition.field)) {
        return metadataError(filePath, `duplicate heading "${heading}"`);
      }

      seenFields.add(definition.field);
      currentDefinition = definition;
      currentLines = [];
      sawField = true;
      continue;
    }

    if (!sawField) {
      if (line.trim().length === 0) {
        continue;
      }

      if (!sawTitle && /^#\s+\S/.test(line)) {
        sawTitle = true;
        continue;
      }

      return metadataError(filePath, "unexpected content before the first metadata field");
    }

    currentLines.push(line);
  }

  finishCurrentField();

  return {
    locale,
    ...parsedFields,
  } as AppleMetadataDocument | GoogleMetadataDocument;
}

function createFrontmatter(
  platform: MetadataPlatform,
  document: PlatformMetadataDocument,
  options: SerializeMarkdownMetadataOptions,
): Record<string, unknown> {
  const configured = options.frontmatter;
  const frontmatter: Record<string, unknown> = {
    locale: normalizeLocaleCode(document.locale),
  };

  if (configured?.storeLocale !== undefined) {
    frontmatter.store_locale = configured.storeLocale;
  }

  if (configured?.platform !== undefined) {
    if (configured.platform !== platform) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `Cannot serialize ${platform} metadata with platform ${configured.platform}`,
      );
    }
    frontmatter.platform = configured.platform;
  }

  if (configured?.source !== undefined) {
    frontmatter.source = configured.source;
  }

  if (configured?.fetchedAt !== undefined) {
    frontmatter.fetched_at = configured.fetchedAt;
  }

  for (const [key, value] of Object.entries(configured?.extensions ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (!key.startsWith("x_")) {
      throw new StoremetaError(
        "VALIDATION_ERROR",
        `Markdown frontmatter extension field "${key}" must start with "x_"`,
      );
    }
    frontmatter[key] = value;
  }

  return frontmatter;
}

export function serializeMarkdownMetadataDocument(
  platform: MetadataPlatform,
  document: PlatformMetadataDocument,
  options: SerializeMarkdownMetadataOptions = {},
): string {
  const frontmatter = YAML.stringify(createFrontmatter(platform, document, options), {
    lineWidth: 0,
    minContentWidth: 0,
  });
  const title = platform === "apple" ? "App Store Listing" : "Google Play Listing";
  const values = document as unknown as Record<string, unknown>;
  const lines = ["---", frontmatter.trimEnd(), "---", "", `# ${title}`];

  for (const definition of fieldsForPlatform(platform)) {
    const value = values[definition.field];
    const shouldInclude =
      options.includeEmptyFields === true ||
      (typeof value === "string" && value.length > 0);

    if (!shouldInclude) {
      continue;
    }

    lines.push("", `## ${definition.heading}`);

    if (typeof value === "string" && value.length > 0) {
      lines.push("", ...value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n"));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderMarkdownMetadataScaffold(
  platform: MetadataPlatform,
  locale: string,
): string {
  return serializeMarkdownMetadataDocument(
    platform,
    { locale: normalizeLocaleCode(locale) },
    { includeEmptyFields: true },
  );
}
