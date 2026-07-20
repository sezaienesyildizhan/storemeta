import { chmod, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const distDirectory = join(projectRoot, "dist");
const tsconfigBuildPath = join(projectRoot, "tsconfig.build.json");

await rm(distDirectory, { recursive: true, force: true });

const result = spawnSync("npx", ["tsc", "-p", tsconfigBuildPath], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await chmod(join(distDirectory, "cli.js"), 0o755);
