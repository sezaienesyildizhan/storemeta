import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import type { ConfiguredPlatform } from "../config/select-platforms.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { metadataFileName } from "../formats/metadata-files.js";
import { renderMarkdownMetadataScaffold } from "../formats/markdown-metadata.js";
import { serializeMetadataDocument } from "../formats/serialize-metadata.js";
import { createCommandContext } from "./context.js";

const DEFAULT_APPLE_SCREENSHOT_TYPES = ["APP_IPHONE_65"];
const DEFAULT_GOOGLE_SCREENSHOT_TYPES = ["phoneScreenshots"];

async function writeFileIfMissing(filePath: string, contents: string): Promise<boolean> {
  try {
    await writeFile(filePath, contents, {
      encoding: "utf8",
      flag: "wx",
    });

    return true;
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "EEXIST"
    ) {
      return false;
    }

    throw cause;
  }
}

function defaultLocalesForPlatform(
  context: Awaited<ReturnType<typeof createCommandContext>>,
  platform: ConfiguredPlatform,
): string[] {
  const configuredLocales =
    platform === "apple"
      ? context.app.settings.apple?.locales?.default
      : context.app.settings.google?.locales?.default;

  return (configuredLocales ?? ["en-US"]).map(normalizeLocaleCode);
}

function screenshotTypesForPlatform(platform: ConfiguredPlatform): string[] {
  return platform === "apple"
    ? DEFAULT_APPLE_SCREENSHOT_TYPES
    : DEFAULT_GOOGLE_SCREENSHOT_TYPES;
}

function renderMetadataSeed(
  platform: ConfiguredPlatform,
  locale: string,
  format: "markdown" | "yaml",
): string {
  if (format === "markdown") {
    return renderMarkdownMetadataScaffold(platform, locale);
  }

  return serializeMetadataDocument({ locale });
}

export async function runScaffoldCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const projectRoot = dirname(context.configPath);
  const metadataBaseDir = resolve(projectRoot, context.app.settings.metadata.baseDir);
  const screenshotsBaseDir = resolve(
    projectRoot,
    context.app.settings.screenshots.baseDir,
  );
  const results: CommandItemResult[] = [];
  const metadataFormat = context.app.settings.metadata.format;

  for (const platform of platforms) {
    const locales = defaultLocalesForPlatform(context, platform);

    for (const locale of locales) {
      const fileName = metadataFileName(locale, metadataFormat);
      const metadataPath = join(metadataBaseDir, platform, fileName);

      await mkdir(dirname(metadataPath), { recursive: true });

      const createdMetadata = await writeFileIfMissing(
        metadataPath,
        renderMetadataSeed(platform, locale, metadataFormat),
      );

      results.push({
        target: `metadata/${platform}/${fileName}`,
        success: true,
        message: createdMetadata ? "Created metadata file" : "Metadata file exists",
      });

      for (const screenshotType of screenshotTypesForPlatform(platform)) {
        const screenshotDir = join(
          screenshotsBaseDir,
          platform,
          locale,
          screenshotType,
        );

        await mkdir(screenshotDir, { recursive: true });

        results.push({
          target: `screenshots/${platform}/${locale}/${screenshotType}`,
          success: true,
          message: "Ensured screenshot directory",
        });
      }
    }
  }

  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}
