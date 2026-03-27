import type { GoogleCredentialsSettings } from "../../config/types.js";

export interface LoadedGoogleCredentials {
  serviceAccountPath?: string;
}

export function loadGoogleCredentials(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): LoadedGoogleCredentials {
  return {
    serviceAccountPath: env[credentials.serviceAccountPathEnv],
  };
}
