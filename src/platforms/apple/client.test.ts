import { describe, expect, it, vi } from "vitest";

import { createAppStoreConnectClient } from "./client.js";

vi.mock("../../auth/apple/jwt.js", () => ({
  createAppleJwtToken: vi.fn().mockResolvedValue("apple-jwt-token"),
}));

describe("AppStoreConnectClient", () => {
  it("adds Apple JWT auth and parses JSON responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "app-1" }],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const client = createAppStoreConnectClient({
        issuerIdEnv: "STORE_APPLE_ISSUER_ID",
        keyIdEnv: "STORE_APPLE_KEY_ID",
        privateKeyPathEnv: "STORE_APPLE_PRIVATE_KEY_PATH",
      });

      await expect(client.requestJson("/apps")).resolves.toEqual({
        data: [{ id: "app-1" }],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.appstoreconnect.apple.com/v1/apps",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer apple-jwt-token",
            Accept: "application/json",
          },
          body: undefined,
        },
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
