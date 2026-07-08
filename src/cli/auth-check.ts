import type { GlobalOptions } from "../cli.js";
import type { CommandItemResult, CommandSummary } from "./result-types.js";
import { getAppleCredentialState } from "../auth/apple/credential-state.js";
import { getGoogleCredentialState } from "../auth/google/credential-state.js";
import { resolveSelectedPlatforms } from "../config/select-platforms.js";
import { createCommandContext } from "./context.js";

function createSummary(results: CommandItemResult[]): CommandSummary {
  const failureCount = results.filter((result) => !result.success).length;
  const successCount = results.length - failureCount;

  return {
    status: failureCount === 0 ? "success" : successCount === 0 ? "failure" : "partial",
    successCount,
    failureCount,
    skippedCount: 0,
    results,
  };
}

export async function runAuthCheckCommand(
  options: Pick<GlobalOptions, "config" | "app" | "platform">,
): Promise<CommandSummary> {
  const context = await createCommandContext(options);
  const platforms = resolveSelectedPlatforms(context.app, context.platform);
  const results: CommandItemResult[] = [];

  for (const platform of platforms) {
    if (platform === "apple" && context.app.settings.apple !== undefined) {
      const state = getAppleCredentialState(context.app.settings.apple.credentials);
      const missing = [state.issuerId, state.keyId, state.privateKeyPath]
        .filter((field) => !field.present)
        .map((field) => field.envVar);

      results.push({
        target: "auth.apple",
        success: missing.length === 0,
        message:
          missing.length === 0
            ? "Apple credential environment variables are present"
            : `Missing Apple credential environment variables: ${missing.join(", ")}`,
      });
    }

    if (platform === "google" && context.app.settings.google !== undefined) {
      const state = getGoogleCredentialState(context.app.settings.google.credentials);

      results.push({
        target: "auth.google",
        success: state.allPresent,
        message: state.allPresent
          ? "Google credential environment variables are present"
          : `Missing Google credential environment variable: ${state.serviceAccountPath.envVar}`,
      });
    }
  }

  return createSummary(results);
}
