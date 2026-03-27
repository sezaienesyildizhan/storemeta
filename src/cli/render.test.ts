import { describe, expect, it } from "vitest";

import { StoremetaError } from "./errors.js";
import { renderCommandError } from "./render.js";

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
