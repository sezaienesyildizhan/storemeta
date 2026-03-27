import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { DEFAULT_CONFIG_FILE } from "../config/load-config.js";

export function renderStarterConfig(): string {
  return `version: 1

project:
  name: example-project
  defaultApp: example-app

apps:
  example-app:
    metadata:
      baseDir: metadata
      format: yaml
    screenshots:
      baseDir: screenshots

    apple:
      appId: "1234567890"
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

  await writeFile(resolvedPath, renderStarterConfig(), "utf8");
  await mkdir(join(projectRoot, "metadata", "apple"), { recursive: true });
  await mkdir(join(projectRoot, "metadata", "google"), { recursive: true });
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
