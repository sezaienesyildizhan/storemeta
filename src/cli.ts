#!/usr/bin/env node

import { Command, Option } from "commander";

import { runInitCommand } from "./cli/init.js";
import { runMetadataPullCommand } from "./cli/metadata-pull.js";
import { renderCommandError, renderCommandSummary } from "./cli/render.js";
import { runValidateCommand } from "./cli/validate.js";

export interface GlobalOptions {
  config?: string;
  app?: string;
  platform?: "apple" | "google" | "all";
  locale?: string;
  dryRun: boolean;
  verbose: boolean;
}

export function buildCliProgram(): Command {
  const program = new Command()
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

  program
    .command("init")
    .description("Create a starter storemeta config")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      await runInitCommand(options.config);
    });

  program
    .command("validate")
    .description("Validate the storemeta project configuration")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runValidateCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
    });

  program
    .command("metadata")
    .description("Metadata commands")
    .command("pull")
    .description("Pull remote metadata into the local project")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      await runMetadataPullCommand({
        config: options.config,
        app: options.app,
        locale: options.locale,
        platform: options.platform,
      });
    });

  return program;
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
