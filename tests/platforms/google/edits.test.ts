import { describe, expect, it, vi } from "vitest";

import { StoremetaError } from "../../../src/cli/errors.js";
import type { GooglePlayClient } from "../../../src/platforms/google/client.js";
import {
  commitGoogleEdit,
  createGoogleEdit,
  withGoogleEditSession,
} from "../../../src/platforms/google/edits.js";

function createClientMock() {
  return {
    requestJson: vi.fn(),
  } as unknown as GooglePlayClient & {
    requestJson: ReturnType<typeof vi.fn>;
  };
}

describe("Google Play edits", () => {
  it("creates an edit for the encoded package name", async () => {
    const client = createClientMock();
    client.requestJson.mockResolvedValueOnce({ id: "edit-1" });

    await expect(createGoogleEdit(client, "com.example.app")).resolves.toEqual({
      id: "edit-1",
    });
    expect(client.requestJson).toHaveBeenCalledWith(
      "/applications/com.example.app/edits",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
  });

  it("commits an edit with optional review flag", async () => {
    const client = createClientMock();
    client.requestJson.mockResolvedValueOnce({ id: "edit-1" });

    await expect(
      commitGoogleEdit(client, "com.example.app", "edit 1", {
        changesNotSentForReview: true,
      }),
    ).resolves.toEqual({ id: "edit-1" });
    expect(client.requestJson).toHaveBeenCalledWith(
      "/applications/com.example.app/edits/edit%201:commit?changesNotSentForReview=true",
      {
        method: "POST",
      },
    );
  });

  it("runs and commits a successful edit session", async () => {
    const client = createClientMock();
    client.requestJson
      .mockResolvedValueOnce({ id: "edit-1" })
      .mockResolvedValueOnce({ id: "edit-1" });
    const run = vi.fn().mockResolvedValueOnce("result");

    await expect(
      withGoogleEditSession(client, "com.example.app", run, {
        changesNotSentForReview: false,
      }),
    ).resolves.toEqual({
      edit: { id: "edit-1" },
      result: "result",
    });
    expect(run).toHaveBeenCalledWith({ id: "edit-1" });
    expect(client.requestJson).toHaveBeenNthCalledWith(
      2,
      "/applications/com.example.app/edits/edit-1:commit?changesNotSentForReview=false",
      {
        method: "POST",
      },
    );
  });

  it("can run an edit session without auto-commit", async () => {
    const client = createClientMock();
    client.requestJson.mockResolvedValueOnce({ id: "edit-1" });

    await expect(
      withGoogleEditSession(client, "com.example.app", async () => "result", {
        autoCommit: false,
      }),
    ).resolves.toEqual({
      edit: { id: "edit-1" },
      result: "result",
    });
    expect(client.requestJson).toHaveBeenCalledTimes(1);
  });

  it("wraps failures before commit with the edit id", async () => {
    const client = createClientMock();
    client.requestJson.mockResolvedValueOnce({ id: "edit-1" });

    await expect(
      withGoogleEditSession(client, "com.example.app", async () => {
        throw new Error("upload failed");
      }),
    ).rejects.toMatchObject({
      name: "StoremetaError",
      code: "API_ERROR",
      message: "Google Play edit session edit-1 failed before commit",
    } satisfies Partial<StoremetaError>);
    expect(client.requestJson).toHaveBeenCalledTimes(1);
  });
});
