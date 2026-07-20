import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");

function parseArgs(argv) {
  const options = {
    config: "storemeta.release.yml",
    envFile: ".env.release.local",
    realStore: false,
    platform: "all",
    locale: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--real-store") {
      options.realStore = true;
      continue;
    }

    if (arg === "--config") {
      options.config = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--env-file") {
      options.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--platform") {
      options.platform = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--locale") {
      options.locale = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!["apple", "google", "all"].includes(options.platform)) {
    throw new Error("--platform must be apple, google, or all");
  }

  return options;
}

function loadEnvFile(envFilePath) {
  if (!existsSync(envFilePath)) {
    return;
  }

  const raw = readFileSync(envFilePath, "utf8");

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function run(command, args, options = {}) {
  console.log(`\n> ${[command, ...args].join(" ")}`);

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runStoreCommand(configPath, args) {
  run("node", ["dist/cli.js", "--config", configPath, ...args]);
}

function withOptionalLocale(args, locale) {
  if (locale === undefined) {
    return args;
  }

  return [...args, "--locale", locale];
}

function assertRealStoreReady(configPath, platforms) {
  const requiredEnvVars = [];

  if (platforms.includes("apple")) {
    requiredEnvVars.push(
      "STORE_APPLE_ISSUER_ID",
      "STORE_APPLE_KEY_ID",
      "STORE_APPLE_PRIVATE_KEY_PATH",
    );
  }

  if (platforms.includes("google")) {
    requiredEnvVars.push("STORE_GOOGLE_SERVICE_ACCOUNT_PATH");
  }

  const missingEnvVars = requiredEnvVars.filter((name) => {
    const value = process.env[name];

    return value === undefined || value.trim().length === 0;
  });

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing real-store credential environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  const placeholderEnvVars = requiredEnvVars.filter((name) => {
    const value = process.env[name] ?? "";

    return (
      value.includes("XXXXXXXXXX") ||
      value.includes("/absolute/path/") ||
      value === "00000000-0000-0000-0000-000000000000"
    );
  });

  if (placeholderEnvVars.length > 0) {
    throw new Error(
      `Real-store credential environment variables still contain placeholders: ${placeholderEnvVars.join(", ")}`,
    );
  }

  const rawConfig = readFileSync(configPath, "utf8");

  if (
    rawConfig.includes("YOUR_APP_STORE_CONNECT_APP_ID") ||
    rawConfig.includes("com.example.yourapp")
  ) {
    throw new Error(
      "Real-store config still contains placeholder Apple or Google app identifiers.",
    );
  }
}

const options = parseArgs(process.argv.slice(2));
const envFilePath = resolve(projectRoot, options.envFile);
const configPath = resolve(projectRoot, options.config);

loadEnvFile(envFilePath);

run("npm", ["run", "check"]);
run("npm", ["run", "test"]);
run("npm", ["run", "build"]);
run("npm", ["pack", "--dry-run"]);

if (!options.realStore) {
  console.log(
    "\nLocal release verification passed. Add --real-store to run Apple/Google API checks.",
  );
  process.exit(0);
}

if (!existsSync(configPath)) {
  throw new Error(
    `Real-store config not found at ${configPath}. Copy examples/release/storemeta.release.example.yml to storemeta.release.yml and fill real app identifiers.`,
  );
}

const platforms =
  options.platform === "all" ? ["apple", "google"] : [options.platform];

assertRealStoreReady(configPath, platforms);
runStoreCommand(configPath, ["validate", "--platform", options.platform]);

for (const platform of platforms) {
  runStoreCommand(
    configPath,
    withOptionalLocale(["metadata", "pull", "--platform", platform], options.locale),
  );
  runStoreCommand(
    configPath,
    withOptionalLocale(
      ["metadata", "push", "--platform", platform, "--dry-run"],
      options.locale,
    ),
  );
  runStoreCommand(
    configPath,
    withOptionalLocale(["screenshots", "pull", "--platform", platform], options.locale),
  );
  runStoreCommand(
    configPath,
    withOptionalLocale(
      ["screenshots", "push", "--platform", platform, "--dry-run"],
      options.locale,
    ),
  );
}

console.log("\nReal-store release verification passed.");
