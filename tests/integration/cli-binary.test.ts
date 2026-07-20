import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliPath = join(process.cwd(), "dist", "cli.js");

describe("built CLI binary", () => {
  it("is executable and prints top-level help", async () => {
    await expect(access(cliPath, constants.X_OK)).resolves.toBeUndefined();

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      "--help",
    ]);

    expect(stderr).toBe("");
    expect(stdout).toContain("Usage: storemeta");
    expect(stdout).toContain("metadata");
    expect(stdout).toContain("screenshots");
    expect(stdout).toContain("auth");
  });

  it("prints subcommand help for metadata diff", async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      "metadata",
      "diff",
      "--help",
    ]);

    expect(stderr).toBe("");
    expect(stdout).toContain("Compare configured metadata locales");
  });
});
