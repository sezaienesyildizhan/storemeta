import { describe, expect, it } from "vitest";

import { orderScreenshotsForWrite } from "./order-screenshots.js";

describe("orderScreenshotsForWrite", () => {
  it("reorders screenshots by position and renames them canonically", () => {
    expect(
      orderScreenshotsForWrite([
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          filePath: "/tmp/second.jpeg",
          fileName: "second.jpeg",
          position: 2,
        },
        {
          platform: "apple",
          locale: "en-US",
          assetType: "APP_IPHONE_65",
          filePath: "/tmp/first.png",
          fileName: "first.png",
          position: 1,
        },
      ]),
    ).toEqual([
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        filePath: "/tmp/first.png",
        fileName: "1.png",
        position: 1,
      },
      {
        platform: "apple",
        locale: "en-US",
        assetType: "APP_IPHONE_65",
        filePath: "/tmp/second.jpeg",
        fileName: "2.jpeg",
        position: 2,
      },
    ]);
  });

  it("defaults missing extensions to .png when renaming", () => {
    expect(
      orderScreenshotsForWrite([
        {
          platform: "google",
          locale: "en-US",
          assetType: "phoneScreenshots",
          filePath: "/tmp/source",
          fileName: "source",
          position: 4,
        },
      ]),
    ).toEqual([
      {
        platform: "google",
        locale: "en-US",
        assetType: "phoneScreenshots",
        filePath: "/tmp/source",
        fileName: "1.png",
        position: 1,
      },
    ]);
  });
});
