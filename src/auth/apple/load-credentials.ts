import type { AppleCredentialsSettings } from "../../config/types.js";

export interface LoadedAppleCredentials {
  issuerId?: string;
  keyId?: string;
  privateKeyPath?: string;
}

export function loadAppleCredentials(
  credentials: AppleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): LoadedAppleCredentials {
  return {
    issuerId: env[credentials.issuerIdEnv],
    keyId: env[credentials.keyIdEnv],
    privateKeyPath: env[credentials.privateKeyPathEnv],
  };
}
