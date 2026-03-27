import { readFile } from "node:fs/promises";

import { importPKCS8, SignJWT } from "jose";

import { StoremetaError } from "../../cli/errors.js";
import type { AppleCredentialsSettings } from "../../config/types.js";
import { requireAppleCredentials } from "./load-credentials.js";

export const APPLE_APP_STORE_CONNECT_AUDIENCE = "appstoreconnect-v1";
const DEFAULT_APPLE_TOKEN_TTL_SECONDS = 15 * 60;
const MAX_APPLE_TOKEN_TTL_SECONDS = 20 * 60;

function resolveAppleTokenIssuedAt(now?: number | Date): number {
  if (now instanceof Date) {
    return Math.floor(now.getTime() / 1000);
  }

  if (typeof now === "number") {
    return Math.floor(now);
  }

  return Math.floor(Date.now() / 1000);
}

function resolveAppleTokenTtlSeconds(expiresInSeconds?: number): number {
  const ttlSeconds = expiresInSeconds ?? DEFAULT_APPLE_TOKEN_TTL_SECONDS;

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new StoremetaError(
      "AUTH_ERROR",
      "Apple JWT expiration must be a positive number of seconds",
    );
  }

  if (ttlSeconds > MAX_APPLE_TOKEN_TTL_SECONDS) {
    throw new StoremetaError(
      "AUTH_ERROR",
      `Apple JWT expiration must not exceed ${MAX_APPLE_TOKEN_TTL_SECONDS} seconds`,
    );
  }

  return Math.floor(ttlSeconds);
}

export async function createAppleJwtToken(
  credentials: AppleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
  options?: {
    now?: number | Date;
    expiresInSeconds?: number;
  },
): Promise<string> {
  const resolvedCredentials = requireAppleCredentials(credentials, env);
  const issuedAt = resolveAppleTokenIssuedAt(options?.now);
  const ttlSeconds = resolveAppleTokenTtlSeconds(options?.expiresInSeconds);
  let privateKeyPem: string;

  try {
    privateKeyPem = await readFile(resolvedCredentials.privateKeyPath, "utf8");
  } catch (cause) {
    throw new StoremetaError(
      "AUTH_ERROR",
      `Failed to read Apple private key file at ${resolvedCredentials.privateKeyPath}`,
      { cause },
    );
  }

  try {
    const privateKey = await importPKCS8(privateKeyPem, "ES256");

    return await new SignJWT({
      iss: resolvedCredentials.issuerId,
      aud: APPLE_APP_STORE_CONNECT_AUDIENCE,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: resolvedCredentials.keyId,
        typ: "JWT",
      })
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ttlSeconds)
      .sign(privateKey);
  } catch (cause) {
    throw new StoremetaError(
      "AUTH_ERROR",
      "Failed to sign Apple JWT from the configured private key",
      { cause },
    );
  }
}
