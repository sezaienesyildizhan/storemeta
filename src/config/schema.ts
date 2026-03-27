import { z } from "zod";

import { StoremetaError } from "../cli/errors.js";
import type { StoremetaConfig } from "./types.js";

const metadataFormatSchema = z.literal("yaml");

const projectSettingsSchema = z
  .object({
    name: z.string().min(1),
    defaultApp: z.string().min(1),
  })
  .strict();

const metadataSettingsSchema = z
  .object({
    baseDir: z.string().min(1),
    format: metadataFormatSchema,
  })
  .strict();

const screenshotSettingsSchema = z
  .object({
    baseDir: z.string().min(1),
  })
  .strict();

const appleCredentialsSettingsSchema = z
  .object({
    issuerIdEnv: z.string().min(1),
    keyIdEnv: z.string().min(1),
    privateKeyPathEnv: z.string().min(1),
  })
  .strict();

const googleCredentialsSettingsSchema = z
  .object({
    serviceAccountPathEnv: z.string().min(1),
  })
  .strict();

const localeSettingsSchema = z
  .object({
    default: z.array(z.string().min(1)).optional(),
    map: z.record(z.string(), z.string().min(1)).optional(),
  })
  .strict();

const screenshotGroupSettingsSchema = z
  .object({
    locales: z.array(z.string().min(1)).min(1),
  })
  .strict();

const googleScreenshotSettingsSchema = z
  .object({
    groups: z.record(z.string(), screenshotGroupSettingsSchema).optional(),
  })
  .strict();

const appleAppSettingsSchema = z
  .object({
    appId: z.string().min(1),
    credentials: appleCredentialsSettingsSchema,
    locales: localeSettingsSchema.optional(),
  })
  .strict();

const googleAppSettingsSchema = z
  .object({
    packageName: z.string().min(1),
    credentials: googleCredentialsSettingsSchema,
    locales: localeSettingsSchema.optional(),
    screenshots: googleScreenshotSettingsSchema.optional(),
  })
  .strict();

const appSettingsSchema = z
  .object({
    metadata: metadataSettingsSchema,
    screenshots: screenshotSettingsSchema,
    apple: appleAppSettingsSchema.optional(),
    google: googleAppSettingsSchema.optional(),
  })
  .strict();

export const storemetaConfigSchema = z
  .object({
    version: z.literal(1),
    project: projectSettingsSchema,
    apps: z
      .record(z.string().min(1), appSettingsSchema)
      .refine((apps) => Object.keys(apps).length > 0, {
        message: "At least one app must be configured",
      }),
  })
  .strict();

function formatSchemaIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function validateRootConfig(config: unknown): StoremetaConfig {
  const result = storemetaConfigSchema.safeParse(config);

  if (!result.success) {
    throw new StoremetaError(
      "CONFIG_ERROR",
      `Config schema validation failed: ${formatSchemaIssues(result.error)}`,
      { cause: result.error },
    );
  }

  return result.data;
}
