import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { createCommandContext } from "./context.js";

export async function runConfigDoctorCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const results: CommandItemResult[] = [
    {
      target: "config",
      success: true,
      message: `Loaded ${context.configPath}`,
    },
    {
      target: "project",
      success: true,
      message: `${context.config.project.name}; default app ${context.config.project.defaultApp}`,
    },
    {
      target: `app.${context.app.id}`,
      success: true,
      message: `Selected platforms: ${platforms.join(", ") || "none"}`,
    },
    {
      target: "metadata.baseDir",
      success: true,
      message: context.app.settings.metadata.baseDir,
    },
    {
      target: "screenshots.baseDir",
      success: true,
      message: context.app.settings.screenshots.baseDir,
    },
  ];

  return {
    status: "success",
    successCount: results.length,
    failureCount: 0,
    skippedCount: 0,
    results,
  };
}
