import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runScaffoldCommand } from "../../src/cli/scaffold.js";

const createdPaths: string[] = [];

afterEach(async () => {
  while (createdPaths.length > 0) {
    const createdPath = createdPaths.pop();

    if (createdPath !== undefined) {
      await rm(createdPath, { recursive: true, force: true });
    }
  }
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(join(tmpdir(), "storemeta-scaffold-"));
  createdPaths.push(projectPath);

  return projectPath;
}

describe("runScaffoldCommand", () => {
  it("creates metadata files and screenshot directories from configured locales", async () => {
    const projectPath = await createTempProject();
    const configPath = join(projectPath, "storemeta.yml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "project:",
        "  name: Scaffold Test",
        "  defaultApp: demo",
        "apps:",
        "  demo:",
        "    metadata:",
        "      baseDir: metadata",
        "      format: yaml",
        "    screenshots:",
        "      baseDir: screenshots",
        "    apple:",
        "      appId: \"1234567890\"",
        "      credentials:",
        "        issuerIdEnv: STORE_APPLE_ISSUER_ID",
        "        keyIdEnv: STORE_APPLE_KEY_ID",
        "        privateKeyPathEnv: STORE_APPLE_PRIVATE_KEY_PATH",
        "      locales:",
        "        default: [en-US, tr]",
        "    google:",
        "      packageName: com.example.demo",
        "      credentials:",
        "        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH",
        "      locales:",
        "        default: [en-US, tr-TR]",
        "",
      ].join("\n"),
      "utf8",
    );

    const summary = await runScaffoldCommand({
      config: configPath,
    });

    expect(summary.status).toBe("success");
    await expect(readFile(join(projectPath, "metadata/apple/tr.yml"), "utf8"))
      .resolves.toBe("locale: tr\n");
    await expect(readFile(join(projectPath, "metadata/google/tr-TR.yml"), "utf8"))
      .resolves.toBe("locale: tr-TR\n");
    await expect(
      access(join(projectPath, "screenshots/apple/en-US/APP_IPHONE_65")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(projectPath, "screenshots/google/tr-TR/phoneScreenshots")),
    ).resolves.toBeUndefined();
  });

  it("creates canonical Markdown metadata files when configured", async () => {
    const projectPath = await createTempProject();
    const configPath = join(projectPath, "storemeta.yml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "project:",
        "  name: Scaffold Test",
        "  defaultApp: demo",
        "apps:",
        "  demo:",
        "    metadata:",
        "      baseDir: metadata",
        "      format: markdown",
        "    screenshots:",
        "      baseDir: screenshots",
        "    apple:",
        '      appId: "1234567890"',
        "      credentials:",
        "        issuerIdEnv: STORE_APPLE_ISSUER_ID",
        "        keyIdEnv: STORE_APPLE_KEY_ID",
        "        privateKeyPathEnv: STORE_APPLE_PRIVATE_KEY_PATH",
        "      locales:",
        "        default: [en-US]",
        "    google:",
        "      packageName: com.example.demo",
        "      credentials:",
        "        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH",
        "      locales:",
        "        default: [tr]",
        "",
      ].join("\n"),
    );

    await runScaffoldCommand({ config: configPath });

    await expect(
      readFile(join(projectPath, "metadata/apple/en-US.md"), "utf8"),
    ).resolves.toContain("# App Store Listing\n\n## App Name");
    await expect(
      readFile(join(projectPath, "metadata/google/tr.md"), "utf8"),
    ).resolves.toContain("# Google Play Listing\n\n## Title");
  });

  it("does not overwrite existing metadata files", async () => {
    const projectPath = await createTempProject();
    const configPath = join(projectPath, "storemeta.yml");
    const metadataPath = join(projectPath, "metadata/google/en-US.yml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "project:",
        "  name: Scaffold Test",
        "  defaultApp: demo",
        "apps:",
        "  demo:",
        "    metadata:",
        "      baseDir: metadata",
        "      format: yaml",
        "    screenshots:",
        "      baseDir: screenshots",
        "    google:",
        "      packageName: com.example.demo",
        "      credentials:",
        "        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH",
        "      locales:",
        "        default: [en-US]",
        "",
      ].join("\n"),
      "utf8",
    );
    await runScaffoldCommand({ config: configPath });
    await writeFile(metadataPath, "locale: en-US\ntitle: Existing\n", "utf8");

    await runScaffoldCommand({ config: configPath });

    await expect(readFile(metadataPath, "utf8")).resolves.toBe(
      "locale: en-US\ntitle: Existing\n",
    );
  });
});
