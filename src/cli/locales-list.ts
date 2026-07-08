import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { normalizeLocaleCode } from "../locales/normalize.js";
import { createCommandContext } from "./context.js";

function formatLocales(locales: string[] | undefined): string {
  if (locales === undefined || locales.length === 0) {
    return "none configured";
  }

  return locales.map(normalizeLocaleCode).join(", ");
}

export async function runLocalesListCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const results: CommandItemResult[] = [];

  for (const platform of platforms) {
    if (platform === "apple" && context.app.settings.apple !== undefined) {
      results.push({
        target: "locales.apple",
        success: true,
        message: formatLocales(context.app.settings.apple.locales?.default),
      });
    }

    if (platform === "google" && context.app.settings.google !== undefined) {
      results.push({
        target: "locales.google",
        success: true,
        message: formatLocales(context.app.settings.google.locales?.default),
      });
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
