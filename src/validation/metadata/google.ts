import { z } from "zod";

import { StoremetaError } from "../../cli/errors.js";
import type { GoogleMetadataDocument } from "../../formats/metadata-types.js";

export const googleMetadataDocumentSchema = z
  .object({
    locale: z.string().min(1),
    title: z.string().min(1).optional(),
    short_description: z.string().min(1).optional(),
    full_description: z.string().min(1).optional(),
    video: z.string().url().optional(),
  })
  .strict();

function formatGoogleMetadataIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function validateGoogleMetadataDocument(
  document: unknown,
): GoogleMetadataDocument {
  const result = googleMetadataDocumentSchema.safeParse(document);

  if (!result.success) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Google metadata validation failed: ${formatGoogleMetadataIssues(result.error)}`,
      { cause: result.error },
    );
  }

  return result.data;
}
