import { readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import type { ConfiguredPlatform } from "../config/select-platforms.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createCommandContext } from "./context.js";

async function listMetadataLocales(platformDir: string): Promise<string[]> {
  try {
    const entries = await readdir(platformDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => [".yml", ".yaml", ".md"].includes(extname(fileName)))
      .map((fileName) => normalizeLocaleCode(fileName.slice(0, -extname(fileName).length)))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function expectedLocalesForPlatform(
  context: Awaited<ReturnType<typeof createCommandContext>>,
  platform: ConfiguredPlatform,
): string[] {
  const locales =
    platform === "apple"
      ? context.app.settings.apple?.locales?.default
      : context.app.settings.google?.locales?.default;

  return (locales ?? []).map(normalizeLocaleCode).sort((left, right) => left.localeCompare(right));
}

export async function runMetadataDiffCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const metadataBaseDir = resolve(
    dirname(context.configPath),
    context.app.settings.metadata.baseDir,
  );
  const results: CommandItemResult[] = [];

  for (const platform of platforms) {
    const expected = expectedLocalesForPlatform(context, platform);
    const actual = await listMetadataLocales(resolve(metadataBaseDir, platform));
    const missing = expected.filter((locale) => !actual.includes(locale));
    const extra = actual.filter((locale) => expected.length > 0 && !expected.includes(locale));

    results.push({
      target: `metadata.${platform}`,
      success: missing.length === 0,
      message: [
        `local: ${actual.length === 0 ? "none" : actual.join(", ")}`,
        expected.length === 0 ? "expected: not configured" : `expected: ${expected.join(", ")}`,
        missing.length === 0 ? undefined : `missing: ${missing.join(", ")}`,
        extra.length === 0 ? undefined : `extra: ${extra.join(", ")}`,
      ]
        .filter((part): part is string => part !== undefined)
        .join("; "),
    });
  }

  const failureCount = results.filter((result) => !result.success).length;

  return {
    status: failureCount === 0 ? "success" : "partial",
    successCount: results.length - failureCount,
    failureCount,
    skippedCount: 0,
    results,
  };
}
