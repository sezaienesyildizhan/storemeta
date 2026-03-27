import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadAppleMetadataDocuments,
  resolveAppleAppInfoResource,
  selectAppleAppInfoResource,
} from "./push.js";
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

beforeEach(() => {
  requestAllAppStoreConnectPagesMock.mockReset();
});

describe("loadAppleMetadataDocuments", () => {
  it("loads and validates Apple metadata documents from the canonical directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(
      join(appleMetadataDirectory, "tr.yml"),
      "locale: tr\napp_name: Ornek\n",
    );
    await writeFile(
      join(appleMetadataDirectory, "en-US.yaml"),
      "locale: en-US\napp_name: Example App\n",
    );

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([
        {
          locale: "en-US",
          app_name: "Example App",
        },
        {
          locale: "tr",
          app_name: "Ornek",
        },
      ]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });

  it("ignores unsupported file extensions in the Apple metadata directory", async () => {
    const metadataBaseDir = await mkdtemp(join(tmpdir(), "storemeta-"));
    const appleMetadataDirectory = join(metadataBaseDir, "apple");

    await mkdir(appleMetadataDirectory, { recursive: true });
    await writeFile(join(appleMetadataDirectory, "notes.txt"), "ignore me");

    try {
      await expect(loadAppleMetadataDocuments(metadataBaseDir)).resolves.toEqual([]);
    } finally {
      await rm(metadataBaseDir, { recursive: true, force: true });
    }
  });
});

describe("selectAppleAppInfoResource", () => {
  it("prefers an iOS app info resource when multiple exist", () => {
    expect(
      selectAppleAppInfoResource([
        {
          id: "mac-app-info",
          type: "appInfos",
          attributes: {
            platform: "MAC_OS",
          },
        },
        {
          id: "ios-app-info",
          type: "appInfos",
          attributes: {
            platform: "IOS",
          },
        },
      ]),
    )?.toMatchObject({
      id: "ios-app-info",
    });
  });
});

describe("resolveAppleAppInfoResource", () => {
  it("loads the target app info resource for an app", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([
      {
        id: "ios-app-info",
        type: "appInfos",
        attributes: {
          platform: "IOS",
        },
      },
    ]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveAppleAppInfoResource(client, "1234567890"),
    ).resolves.toEqual({
      id: "ios-app-info",
      type: "appInfos",
      attributes: {
        platform: "IOS",
      },
    });

    expect(requestAllAppStoreConnectPagesMock).toHaveBeenCalledWith(
      client,
      "/apps/1234567890/appInfos",
    );
  });

  it("fails when no app info resource exists", async () => {
    requestAllAppStoreConnectPagesMock.mockResolvedValueOnce([]);

    const client = {} as AppStoreConnectClient;

    await expect(
      resolveAppleAppInfoResource(client, "1234567890"),
    ).rejects.toThrow(/returned no app info resource/);
  });
});
