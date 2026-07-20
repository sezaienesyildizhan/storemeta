import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { StoremetaError } from "./errors.js";
import { DEFAULT_CONFIG_FILE } from "../config/load-config.js";
import { renderMarkdownMetadataScaffold } from "../formats/markdown-metadata.js";

export function renderStarterConfig(): string {
  return `version: 1

project:
  name: example-project
  defaultApp: example-app

apps:
  example-app:
    metadata:
      baseDir: metadata
      format: markdown
    screenshots:
      baseDir: screenshots

    apple:
      appId: "0000000000"
      credentials:
        issuerIdEnv: STORE_APPLE_ISSUER_ID
        keyIdEnv: STORE_APPLE_KEY_ID
        privateKeyPathEnv: STORE_APPLE_PRIVATE_KEY_PATH
      locales:
        default: [en-US]

    google:
      packageName: com.example.app
      credentials:
        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH
      locales:
        default: [en-US]
`;
}

export async function runInitCommand(configPath?: string): Promise<string> {
  const resolvedPath = resolve(configPath ?? DEFAULT_CONFIG_FILE);
  const projectRoot = dirname(resolvedPath);

  try {
    await access(resolvedPath);
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Refusing to overwrite existing config file at ${resolvedPath}`,
    );
  } catch (error) {
    if (
      error instanceof StoremetaError ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code !== "ENOENT")
    ) {
      throw error;
    }
  }

  await mkdir(projectRoot, { recursive: true });
  await writeFile(resolvedPath, renderStarterConfig(), "utf8");
  await mkdir(join(projectRoot, "metadata", "apple"), { recursive: true });
  await mkdir(join(projectRoot, "metadata", "google"), { recursive: true });
  await writeFile(
    join(projectRoot, "metadata", "apple", "en-US.md"),
    renderMarkdownMetadataScaffold("apple", "en-US"),
    "utf8",
  );
  await writeFile(
    join(projectRoot, "metadata", "google", "en-US.md"),
    renderMarkdownMetadataScaffold("google", "en-US"),
    "utf8",
  );
  await mkdir(
    join(projectRoot, "screenshots", "apple", "en-US", "APP_IPHONE_65"),
    { recursive: true },
  );
  await mkdir(
    join(projectRoot, "screenshots", "google", "en-US", "phoneScreenshots"),
    { recursive: true },
  );

  return resolvedPath;
}
