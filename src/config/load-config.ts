import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import YAML from "yaml";

import { StoremetaError } from "../cli/errors.js";

export const DEFAULT_CONFIG_FILE = "storemeta.yml";

export interface LoadedConfigFile {
  path: string;
  raw: string;
  parsed: unknown;
}

export function resolveConfigPath(configPath?: string): string {
  return resolve(configPath ?? DEFAULT_CONFIG_FILE);
}

export async function loadConfigFile(configPath?: string): Promise<LoadedConfigFile> {
  const resolvedPath = resolveConfigPath(configPath);

  let raw: string;
  try {
    raw = await readFile(resolvedPath, "utf8");
  } catch (cause) {
    throw new StoremetaError(
      "FILESYSTEM_ERROR",
      `Failed to read config file at ${resolvedPath}`,
      { cause },
    );
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (cause) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Failed to parse YAML config at ${resolvedPath}`,
      { cause },
    );
  }

  return {
    path: resolvedPath,
    raw,
    parsed,
  };
}
