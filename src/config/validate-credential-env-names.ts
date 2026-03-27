import { StoremetaError } from "../cli/errors.js";
import { listConfiguredApps } from "./apps.js";
import type { StoremetaConfig } from "./types.js";

const ENV_VAR_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isValidEnvVarName(value: string): boolean {
  return ENV_VAR_NAME_PATTERN.test(value);
}

export function validateCredentialEnvVarNames(config: StoremetaConfig): void {
  const issues: string[] = [];

  for (const app of listConfiguredApps(config)) {
    if (app.settings.apple !== undefined) {
      const { credentials } = app.settings.apple;

      if (!isValidEnvVarName(credentials.issuerIdEnv)) {
        issues.push(`apps.${app.id}.apple.credentials.issuerIdEnv: invalid env var name`);
      }

      if (!isValidEnvVarName(credentials.keyIdEnv)) {
        issues.push(`apps.${app.id}.apple.credentials.keyIdEnv: invalid env var name`);
      }

      if (!isValidEnvVarName(credentials.privateKeyPathEnv)) {
        issues.push(
          `apps.${app.id}.apple.credentials.privateKeyPathEnv: invalid env var name`,
        );
      }
    }

    if (app.settings.google !== undefined) {
      const { credentials } = app.settings.google;

      if (!isValidEnvVarName(credentials.serviceAccountPathEnv)) {
        issues.push(
          `apps.${app.id}.google.credentials.serviceAccountPathEnv: invalid env var name`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Credential environment variable validation failed: ${issues.join("; ")}`,
    );
  }
}
