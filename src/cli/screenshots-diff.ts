import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import type { ConfiguredPlatform } from "../config/select-platforms.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createCommandContext } from "./context.js";

async function listLocalScreenshotLocales(platformDir: string): Promise<string[]> {
  try {
    const entries = await readdir(platformDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => normalizeLocaleCode(entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function countScreenshotSets(platformDir: string, locale: string): Promise<number> {
  try {
    const entries = await readdir(join(platformDir, locale), { withFileTypes: true });

    return entries.filter((entry) => entry.isDirectory()).length;
  } catch {
    return 0;
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

export async function runScreenshotsDiffCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const screenshotsBaseDir = resolve(
    dirname(context.configPath),
    context.app.settings.screenshots.baseDir,
  );
  const results: CommandItemResult[] = [];

  for (const platform of platforms) {
    const platformDir = resolve(screenshotsBaseDir, platform);
    const expected = expectedLocalesForPlatform(context, platform);
    const actual = await listLocalScreenshotLocales(platformDir);
    const missing = expected.filter((locale) => !actual.includes(locale));
    const setCounts = await Promise.all(
      actual.map(async (locale) => `${locale}:${await countScreenshotSets(platformDir, locale)}`),
    );

    results.push({
      target: `screenshots.${platform}`,
      success: missing.length === 0,
      message: [
        `local locales: ${actual.length === 0 ? "none" : actual.join(", ")}`,
        setCounts.length === 0 ? undefined : `sets: ${setCounts.join(", ")}`,
        expected.length === 0 ? "expected: not configured" : `expected: ${expected.join(", ")}`,
        missing.length === 0 ? undefined : `missing: ${missing.join(", ")}`,
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
