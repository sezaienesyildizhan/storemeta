import { z } from "zod";

import { StoremetaError } from "../../cli/errors.js";
import type { AppleMetadataDocument } from "../../formats/metadata-types.js";

export const appleMetadataDocumentSchema = z
  .object({
    locale: z.string().min(1),
    app_name: z.string().min(1).optional(),
    subtitle: z.string().min(1).optional(),
    keywords: z.string().min(1).optional(),
    promotional_text: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    whats_new: z.string().min(1).optional(),
    support_url: z.string().url().optional(),
    marketing_url: z.string().url().optional(),
    privacy_policy_url: z.string().url().optional(),
  })
  .strict();

function formatAppleMetadataIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function validateAppleMetadataDocument(
  document: unknown,
): AppleMetadataDocument {
  const result = appleMetadataDocumentSchema.safeParse(document);

  if (!result.success) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Apple metadata validation failed: ${formatAppleMetadataIssues(result.error)}`,
      { cause: result.error },
    );
  }

  return result.data;
}
