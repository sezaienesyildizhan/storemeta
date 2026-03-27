import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAppleAppInfoLocalizations } from "./pull.js";
import type { AppStoreConnectClient } from "../client.js";

const { requestAllAppStoreConnectPagesMock } = vi.hoisted(() => ({
  requestAllAppStoreConnectPagesMock: vi.fn(),
}));

vi.mock("../client.js", async () => {
  const actual = await vi.importActual("../client.js");

  return {
    ...actual,
    requestAllAppStoreConnectPages: requestAllAppStoreConnectPagesMock,
  };
});

describe("fetchAppleAppInfoLocalizations", () => {
  beforeEach(() => {
    requestAllAppStoreConnectPagesMock.mockReset();
  });

  it("resolves app info localizations through the appInfos relationship", async () => {
    requestAllAppStoreConnectPagesMock
      .mockResolvedValueOnce([
        {
          id: "app-info-1",
          type: "appInfos",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "app-info-loc-1",
          type: "appInfoLocalizations",
          attributes: {
            locale: "en-US",
            name: "Example App",
          },
        },
      ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppInfoLocalizations(client, "1234567890"),
    ).resolves.toEqual([
      {
        id: "app-info-loc-1",
        type: "appInfoLocalizations",
        attributes: {
          locale: "en-US",
          name: "Example App",
        },
      },
    ]);

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      1,
      client,
      "/apps/1234567890/appInfos",
    );
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenNthCalledWith(
      2,
      client,
      "/appInfos/app-info-1/appInfoLocalizations",
    );
  });

  it("returns an empty list when the app has no app info resources", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);

    const client = {} as AppStoreConnectClient;

    await expect(
      fetchAppleAppInfoLocalizations(client, "1234567890"),
    ).resolves.toEqual([]);
    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledTimes(1);
  });
});
