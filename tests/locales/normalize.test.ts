import { describe, expect, it } from "vitest";

import { getScreenshotGroup, listScreenshotGroups } from "../../src/locales/groups.js";
import { mapLocaleCode, mapLocaleCodes } from "../../src/locales/map.js";
import { normalizeLocaleCode } from "../../src/locales/normalize.js";
import { validateScreenshotGroups } from "../../src/locales/validate-groups.js";

describe("normalizeLocaleCode", () => {
  it("normalizes script locales", () => {
    expect(normalizeLocaleCode("zh_hans")).toBe("zh-Hans");
    expect(normalizeLocaleCode("ZH-hant")).toBe("zh-Hant");
  });

  it("normalizes language and region locales", () => {
    expect(normalizeLocaleCode("he_il")).toBe("he-IL");
    expect(normalizeLocaleCode("en_us")).toBe("en-US");
  });
});

describe("mapLocaleCode", () => {
  it("applies configured locale mappings after normalization", () => {
    expect(
      mapLocaleCode("iw_il", {
        map: {
          "iw-IL": "he-IL",
        },
      }),
    ).toBe("he-IL");
  });
});

describe("mapLocaleCodes", () => {
  it("maps locale arrays deterministically", () => {
    expect(
      mapLocaleCodes(["en_us", "iw_il"], {
        map: {
          "iw-IL": "he-IL",
        },
      }),
    ).toEqual(["en-US", "he-IL"]);
  });
});

describe("listScreenshotGroups", () => {
  it("normalizes grouped english locales", () => {
    expect(
      listScreenshotGroups({
        groups: {
          english: {
            locales: ["en_us", "EN-gb", "en-AU", "en_ca"],
          },
        },
      }),
    ).toEqual([
      {
        name: "english",
        locales: ["en-US", "en-GB", "en-AU", "en-CA"],
      },
    ]);
  });
});

describe("getScreenshotGroup", () => {
  it("returns one normalized screenshot group by name", () => {
    expect(
      getScreenshotGroup(
        {
          groups: {
            english: {
              locales: ["en_us", "en_gb"],
            },
          },
        },
        "english",
      ),
    ).toEqual({
      name: "english",
      locales: ["en-US", "en-GB"],
    });
  });
});

describe("validateScreenshotGroups", () => {
  it("rejects duplicate locales after normalization", () => {
    expect(() =>
      validateScreenshotGroups({
        groups: {
          english: {
            locales: ["en_us", "en-US"],
          },
        },
      }),
    ).toThrow(/duplicate locales after normalization/);
  });
});
