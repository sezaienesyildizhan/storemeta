import { describe, expect, it } from "vitest";

import { applyCommandSummaryExitCode } from "../../src/cli/exit-code.js";

describe("applyCommandSummaryExitCode", () => {
  it("sets a non-zero exit code for partial summaries", () => {
    const processLike: { exitCode?: number } = {};

    applyCommandSummaryExitCode(
      {
        status: "partial",
        successCount: 1,
        failureCount: 1,
        skippedCount: 0,
        results: [],
      },
      processLike,
    );

    expect(processLike.exitCode).toBe(1);
  });

  it("does not change the exit code for successful summaries", () => {
    const processLike: { exitCode?: number } = {};

    applyCommandSummaryExitCode(
      {
        status: "success",
        successCount: 1,
        failureCount: 0,
        skippedCount: 0,
        results: [],
      },
      processLike,
    );

    expect(processLike.exitCode).toBeUndefined();
  });
});
