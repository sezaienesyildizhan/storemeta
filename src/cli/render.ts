import { StoremetaError } from "./errors.js";
import type { CommandSummary } from "./result-types.js";

function renderStatusLabel(success: boolean): string {
  return success ? "OK" : "ERR";
}

function renderCause(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }

  if (typeof cause === "string") {
    return cause;
  }

  return undefined;
}

function renderErrorLabel(error: StoremetaError): string {
  switch (error.code) {
    case "CONFIG_ERROR":
      return "Config error";
    case "AUTH_ERROR":
      return "Auth error";
    case "VALIDATION_ERROR":
      return "Validation error";
    case "API_ERROR":
      return "API error";
    case "FILESYSTEM_ERROR":
      return "Filesystem error";
  }
}

export function renderCommandSummary(summary: CommandSummary): string {
  const lines = [
    "Command Summary",
    `Status: ${summary.status}`,
    `Succeeded: ${summary.successCount}`,
    `Failed: ${summary.failureCount}`,
    `Skipped: ${summary.skippedCount}`,
  ];

  if (summary.results.length > 0) {
    lines.push("Results:");
    lines.push(
      ...summary.results.map((result) =>
        `- ${renderStatusLabel(result.success)} ${result.target}${result.message === undefined ? "" : ` - ${result.message}`}`,
      ),
    );
  }

  return lines.join("\n");
}

export function renderCommandError(
  error: unknown,
  options?: { verbose?: boolean },
): string {
  if (error instanceof StoremetaError) {
    const lines = [`${renderErrorLabel(error)}: ${error.message}`];

    if (options?.verbose) {
      const cause = renderCause(error.cause);

      if (cause !== undefined) {
        lines.push(`Cause: ${cause}`);
      }
    }

    return lines.join("\n");
  }

  if (error instanceof Error) {
    return options?.verbose ? `${error.name}: ${error.message}` : error.message;
  }

  return "An unknown error occurred";
}
