import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { generateKeyPairSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

import {
  APPLE_APP_STORE_CONNECT_AUDIENCE,
  createAppleJwtToken,
} from "./jwt.js";

describe("createAppleJwtToken", () => {
  it("signs an App Store Connect JWT from the configured .p8 private key", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "storemeta-"));
    const privateKeyPath = join(tempDirectory, "AuthKey_TEST123.p8");
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const privateKeyPem = privateKey.export({
      type: "pkcs8",
      format: "pem",
    });

    await writeFile(privateKeyPath, privateKeyPem);

    try {
      const token = await createAppleJwtToken(
        {
          issuerIdEnv: "STORE_APPLE_ISSUER_ID",
          keyIdEnv: "STORE_APPLE_KEY_ID",
          privateKeyPathEnv: "STORE_APPLE_PRIVATE_KEY_PATH",
        },
        {
          STORE_APPLE_ISSUER_ID: "issuer-123",
          STORE_APPLE_KEY_ID: "TEST123",
          STORE_APPLE_PRIVATE_KEY_PATH: privateKeyPath,
        },
        {
          now: 1_710_000_000,
          expiresInSeconds: 600,
        },
      );

      expect(decodeProtectedHeader(token)).toMatchObject({
        alg: "ES256",
        kid: "TEST123",
        typ: "JWT",
      });
      expect(decodeJwt(token)).toMatchObject({
        iss: "issuer-123",
        aud: APPLE_APP_STORE_CONNECT_AUDIENCE,
        iat: 1_710_000_000,
        exp: 1_710_000_600,
      });

      await expect(
        jwtVerify(token, publicKey, {
          issuer: "issuer-123",
          audience: APPLE_APP_STORE_CONNECT_AUDIENCE,
          currentDate: new Date(1_710_000_000 * 1000),
        }),
      ).resolves.toBeDefined();
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });
});
