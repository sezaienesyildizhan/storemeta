import type { CommandSummary } from "./result-types.js";

export function applyCommandSummaryExitCode(
  summary: CommandSummary,
  processLike: { exitCode?: number | string | null } = process,
): void {
  if (summary.status === "success") {
    return;
  }

  processLike.exitCode = 1;
}
