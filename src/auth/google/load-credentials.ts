import { StoremetaError } from "../../cli/errors.js";
import type { GoogleCredentialsSettings } from "../../config/types.js";

export interface LoadedGoogleCredentials {
  serviceAccountPath?: string;
}

export interface ResolvedGoogleCredentials {
  serviceAccountPath: string;
}

function hasText(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function loadGoogleCredentials(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): LoadedGoogleCredentials {
  return {
    serviceAccountPath: env[credentials.serviceAccountPathEnv],
  };
}

export function requireGoogleCredentials(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedGoogleCredentials {
  const loaded = loadGoogleCredentials(credentials, env);

  if (!hasText(loaded.serviceAccountPath)) {
    throw new StoremetaError(
      "AUTH_ERROR",
      `Missing Google credentials in environment: ${credentials.serviceAccountPathEnv}`,
    );
  }

  return {
    serviceAccountPath: loaded.serviceAccountPath,
  };
}
