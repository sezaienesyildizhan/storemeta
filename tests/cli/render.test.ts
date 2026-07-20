import { describe, expect, it } from "vitest";

import { StoremetaError } from "../../src/cli/errors.js";
import { renderCommandError, renderCommandSummary } from "../../src/cli/render.js";

describe("renderCommandError", () => {
  it("renders consistent labels for storemeta error categories", () => {
    expect(
      renderCommandError(new StoremetaError("CONFIG_ERROR", "Bad config")),
    ).toBe("Config error: Bad config");
    expect(
      renderCommandError(new StoremetaError("AUTH_ERROR", "Missing token")),
    ).toBe("Auth error: Missing token");
    expect(
      renderCommandError(new StoremetaError("VALIDATION_ERROR", "Bad file")),
    ).toBe("Validation error: Bad file");
    expect(
      renderCommandError(new StoremetaError("API_ERROR", "Bad response")),
    ).toBe("API error: Bad response");
    expect(
      renderCommandError(new StoremetaError("FILESYSTEM_ERROR", "Read failed")),
    ).toBe("Filesystem error: Read failed");
  });
});

describe("renderCommandSummary", () => {
  it("renders a standard command summary header and bullet results", () => {
    expect(
      renderCommandSummary({
        status: "success",
        successCount: 1,
        failureCount: 0,
        skippedCount: 0,
        results: [
          {
            target: "apple/en-US",
            success: true,
            message: "Synced Apple metadata",
          },
        ],
      }),
    ).toBe(
      [
        "Command Summary",
        "Status: success",
        "Succeeded: 1",
        "Failed: 0",
        "Skipped: 0",
        "Results:",
        "- OK apple/en-US - Synced Apple metadata",
      ].join("\n"),
    );
  });
});
