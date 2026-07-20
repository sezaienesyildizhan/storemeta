import { describe, expect, it, vi } from "vitest";

import {
  createAppStoreConnectClient,
  patchAppStoreConnectJson,
  postAppStoreConnectJson,
  requestAllAppStoreConnectPages,
} from "../../../src/platforms/apple/client.js";

vi.mock("../../../src/auth/apple/jwt.js", () => ({
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

  it("renders Apple API errors without leaking auth material", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({
        errors: [
          {
            code: "ENTITY_ERROR",
            title: "Invalid Attribute",
            detail: "The provided value is not allowed.",
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const client = createAppStoreConnectClient({
        issuerIdEnv: "STORE_APPLE_ISSUER_ID",
        keyIdEnv: "STORE_APPLE_KEY_ID",
        privateKeyPathEnv: "STORE_APPLE_PRIVATE_KEY_PATH",
      });

      await expect(client.requestJson("/apps")).rejects.toThrow(
        "App Store Connect API request failed with 409 Conflict: ENTITY_ERROR - Invalid Attribute - The provided value is not allowed.",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("wraps transport failures in a StoremetaError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket hang up")));

    try {
      const client = createAppStoreConnectClient({
        issuerIdEnv: "STORE_APPLE_ISSUER_ID",
        keyIdEnv: "STORE_APPLE_KEY_ID",
        privateKeyPathEnv: "STORE_APPLE_PRIVATE_KEY_PATH",
      });

      await expect(client.requestJson("/apps")).rejects.toMatchObject({
        code: "API_ERROR",
        message:
          "App Store Connect API request failed before a response was received",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("requestAllAppStoreConnectPages", () => {
  it("follows pagination links until the last page", async () => {
    const requestJson = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "page-1" }],
        links: {
          next: "https://api.appstoreconnect.apple.com/v1/apps?cursor=next",
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "page-2" }],
        links: {},
      });
    const client = { requestJson } as unknown as ReturnType<
      typeof createAppStoreConnectClient
    >;

    await expect(
      requestAllAppStoreConnectPages(client, "/apps"),
    ).resolves.toEqual([{ id: "page-1" }, { id: "page-2" }]);
  });

  it("stops on empty pages even if the API returns another next link", async () => {
    const requestJson = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "page-1" }],
        links: {
          next: "https://api.appstoreconnect.apple.com/v1/apps?cursor=next",
        },
      })
      .mockResolvedValueOnce({
        data: [],
        links: {
          next: "https://api.appstoreconnect.apple.com/v1/apps?cursor=unexpected",
        },
      });
    const client = { requestJson } as unknown as ReturnType<
      typeof createAppStoreConnectClient
    >;

    await expect(
      requestAllAppStoreConnectPages(client, "/apps"),
    ).resolves.toEqual([{ id: "page-1" }]);
    expect(requestJson).toHaveBeenCalledTimes(2);
  });
});

describe("postAppStoreConnectJson", () => {
  it("sends JSON POST requests through the shared client", async () => {
    const requestJson = vi.fn().mockResolvedValue({ data: { id: "created" } });
    const client = { requestJson } as unknown as ReturnType<
      typeof createAppStoreConnectClient
    >;

    await expect(
      postAppStoreConnectJson(client, "/apps", {
        data: {
          type: "apps",
        },
      }),
    ).resolves.toEqual({
      data: { id: "created" },
    });

    expect(requestJson).toHaveBeenCalledWith("/apps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "apps",
        },
      }),
    });
  });
});

describe("patchAppStoreConnectJson", () => {
  it("sends JSON PATCH requests through the shared client", async () => {
    const requestJson = vi.fn().mockResolvedValue({ data: { id: "patched" } });
    const client = { requestJson } as unknown as ReturnType<
      typeof createAppStoreConnectClient
    >;

    await expect(
      patchAppStoreConnectJson(client, "/apps/app-1", {
        data: {
          id: "app-1",
          type: "apps",
        },
      }),
    ).resolves.toEqual({
      data: { id: "patched" },
    });

    expect(requestJson).toHaveBeenCalledWith("/apps/app-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          id: "app-1",
          type: "apps",
        },
      }),
    });
  });
});
