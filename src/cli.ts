#!/usr/bin/env node

import { Command, Option } from "commander";

import { runAuthCheckCommand } from "./cli/auth-check.js";
import { runConfigDoctorCommand } from "./cli/config-doctor.js";
import { runInitCommand } from "./cli/init.js";
import { applyCommandSummaryExitCode } from "./cli/exit-code.js";
import { runLocalesListCommand } from "./cli/locales-list.js";
import { runMetadataDiffCommand } from "./cli/metadata-diff.js";
import { runMetadataPullCommand } from "./cli/metadata-pull.js";
import { runMetadataPushCommand } from "./cli/metadata-push.js";
import { renderCommandError, renderCommandSummary } from "./cli/render.js";
import { runScaffoldCommand } from "./cli/scaffold.js";
import { runScreenshotsDiffCommand } from "./cli/screenshots-diff.js";
import { runScreenshotsPullCommand } from "./cli/screenshots-pull.js";
import { runScreenshotsPushCommand } from "./cli/screenshots-push.js";
import { runValidateCommand } from "./cli/validate.js";

export interface GlobalOptions {
  config?: string;
  app?: string;
  platform?: "apple" | "google" | "all";
  locale?: string;
  dryRun: boolean;
  replace: boolean;
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
    .option(
      "--replace",
      "Delete existing remote screenshots before uploading new ones",
    )
    .option("--verbose", "Enable verbose output");
  const metadataCommand = program
    .command("metadata")
    .description("Metadata commands");
  const screenshotsCommand = program
    .command("screenshots")
    .description("Screenshot commands");
  const authCommand = program.command("auth").description("Auth commands");
  const configCommand = program.command("config").description("Config commands");
  const localesCommand = program.command("locales").description("Locale commands");

  program
    .command("init")
    .description("Create a starter storemeta config")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const configPath = await runInitCommand(options.config);
      const summary = await runScaffoldCommand({
        config: configPath,
        app: options.app,
        platform: options.platform,
      });
      console.log(
        [
          "Created starter storemeta project.",
          "Next steps:",
          "1. Fill app identifiers in storemeta.yml.",
          "2. Create Apple App Store Connect API credentials and Google Play service account credentials.",
          "3. Export the credential environment variables named in storemeta.yml.",
          "4. Run storemeta auth check, then storemeta validate.",
          "See docs/AUTH_SETUP.md for credential setup.",
        ].join("\n"),
      );
      console.log(renderCommandSummary(summary));
    });

  program
    .command("scaffold")
    .description("Create missing metadata files and screenshot folders from config")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runScaffoldCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
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
      applyCommandSummaryExitCode(summary);
    });

  metadataCommand
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

  metadataCommand
    .command("push")
    .description("Push local metadata to the store")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runMetadataPushCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
        locale: options.locale,
        dryRun: options.dryRun,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  metadataCommand
    .command("diff")
    .description("Compare configured metadata locales with local metadata files")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runMetadataDiffCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  authCommand
    .command("check")
    .description("Check configured credential environment variables")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runAuthCheckCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  configCommand
    .command("doctor")
    .description("Inspect resolved config, app, directories, and platforms")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runConfigDoctorCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  localesCommand
    .command("list")
    .description("List configured default locales")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runLocalesListCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  screenshotsCommand
    .command("pull")
    .description("Pull remote screenshots into the local project")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runScreenshotsPullCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
        locale: options.locale,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  screenshotsCommand
    .command("diff")
    .description("Compare configured screenshot locales with local screenshot folders")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runScreenshotsDiffCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
    });

  screenshotsCommand
    .command("push")
    .description("Push local screenshots to the store")
    .action(async () => {
      const options = program.opts<GlobalOptions>();
      const summary = await runScreenshotsPushCommand({
        config: options.config,
        app: options.app,
        platform: options.platform,
        locale: options.locale,
        dryRun: options.dryRun,
        replace: options.replace,
      });
      console.log(renderCommandSummary(summary));
      applyCommandSummaryExitCode(summary);
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
