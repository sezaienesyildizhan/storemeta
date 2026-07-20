import { beforeEach, describe, expect, it, vi } from "vitest";

import { StoremetaError } from "../../../src/cli/errors.js";
import {
  createGooglePlayClient,
  GooglePlayClient,
} from "../../../src/platforms/google/client.js";

const { getGoogleAccessTokenMock } = vi.hoisted(() => ({
  getGoogleAccessTokenMock: vi.fn(),
}));

vi.mock("../../../src/auth/google/service-account-auth.js", () => ({
  getGoogleAccessToken: getGoogleAccessTokenMock,
}));

const credentials = {
  serviceAccountPathEnv: "GOOGLE_SERVICE_ACCOUNT_PATH",
};

beforeEach(() => {
  getGoogleAccessTokenMock.mockReset();
  vi.unstubAllGlobals();
});

describe("GooglePlayClient", () => {
  it("adds auth headers and resolves relative Google Play API paths", async () => {
    getGoogleAccessTokenMock.mockResolvedValueOnce("access-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const env = {
      GOOGLE_SERVICE_ACCOUNT_PATH: "/tmp/service-account.json",
    };
    const client = new GooglePlayClient(credentials, env);

    await expect(
      client.requestJson("/applications/com.example.app", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Example" }),
      }),
    ).resolves.toEqual({ ok: true });

    expect(getGoogleAccessTokenMock).toHaveBeenCalledWith(credentials, env);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer access-token",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Example" }),
      },
    );
  });

  it("preserves absolute URLs for upload endpoints", async () => {
    getGoogleAccessTokenMock.mockResolvedValueOnce("access-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new GooglePlayClient(credentials, {});

    await expect(
      client.request("https://uploads.example.com/screenshot", {
        method: "POST",
      }),
    ).resolves.toBeInstanceOf(Response);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://uploads.example.com/screenshot",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
        },
        body: undefined,
      },
    );
  });

  it("throws a StoremetaError for non-2xx API responses", async () => {
    getGoogleAccessTokenMock.mockResolvedValueOnce("access-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response("nope", {
          status: 403,
          statusText: "Forbidden",
        }),
      ),
    );
    const client = new GooglePlayClient(credentials, {});
    const request = client.request("/applications/com.example.app");

    await expect(request).rejects.toThrow(StoremetaError);
    await expect(request).rejects.toThrow(
      /Google Play API request failed with 403 Forbidden/,
    );
  });
});

describe("createGooglePlayClient", () => {
  it("creates a GooglePlayClient instance", () => {
    expect(createGooglePlayClient(credentials)).toBeInstanceOf(GooglePlayClient);
  });
});
