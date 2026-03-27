#!/usr/bin/env node

import { Command, Option } from "commander";

import { renderCommandError } from "./cli/render.js";

export interface GlobalOptions {
  config?: string;
  app?: string;
  platform?: "apple" | "google" | "all";
  locale?: string;
  dryRun: boolean;
  verbose: boolean;
}

export function buildCliProgram(): Command {
  return new Command()
    .name("storemeta")
    .description(
      "CLI for pulling, validating, and pushing App Store Connect and Google Play metadata and screenshots.",
    )
    .option("--config <path>", "Path to the root storemeta config file")
    .option("--app <id>", "Configured app identifier")
    .addOption(
      new Option("--platform <platform>", "Target platform")
        .choices(["apple", "google", "all"]),
    )
    .option("--locale <code>", "Target locale code")
    .option("--dry-run", "Preview changes without applying them")
    .option("--verbose", "Enable verbose output");
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = buildCliProgram();

  await program.parseAsync(argv);
}

export function hasVerboseFlag(argv: string[]): boolean {
  return argv.includes("--verbose");
}

void runCli().catch((error: unknown) => {
  console.error(
    renderCommandError(error, {
      verbose: hasVerboseFlag(process.argv),
    }),
  );
  process.exitCode = 1;
});
