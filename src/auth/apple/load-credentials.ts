import { StoremetaError } from "../../cli/errors.js";
import type { AppleCredentialsSettings } from "../../config/types.js";

export interface LoadedAppleCredentials {
  issuerId?: string;
  keyId?: string;
  privateKeyPath?: string;
}

export interface ResolvedAppleCredentials {
  issuerId: string;
  keyId: string;
  privateKeyPath: string;
}

function hasText(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
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

export function requireAppleCredentials(
  credentials: AppleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedAppleCredentials {
  const loaded = loadAppleCredentials(credentials, env);
  const missing: string[] = [];

  if (!hasText(loaded.issuerId)) {
    missing.push(credentials.issuerIdEnv);
  }

  if (!hasText(loaded.keyId)) {
    missing.push(credentials.keyIdEnv);
  }

  if (!hasText(loaded.privateKeyPath)) {
    missing.push(credentials.privateKeyPathEnv);
  }

  if (missing.length > 0) {
    throw new StoremetaError(
      "AUTH_ERROR",
      `Missing Apple credentials in environment: ${missing.join(", ")}`,
    );
  }

  const { issuerId, keyId, privateKeyPath } = loaded;

  if (!hasText(issuerId) || !hasText(keyId) || !hasText(privateKeyPath)) {
    throw new StoremetaError(
      "AUTH_ERROR",
      "Apple credential resolution failed unexpectedly after validation",
    );
  }

  return {
    issuerId,
    keyId,
    privateKeyPath,
  };
}
