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

function getCharacterCount(value: string): number {
  return Array.from(value).length;
}

export function validateGoogleMetadataLengthConstraints(
  document: GoogleMetadataDocument,
): void {
  const issues: string[] = [];

  if (document.title !== undefined && getCharacterCount(document.title) > 30) {
    issues.push("title: must be 30 characters or fewer");
  }

  if (
    document.short_description !== undefined &&
    getCharacterCount(document.short_description) > 80
  ) {
    issues.push("short_description: must be 80 characters or fewer");
  }

  if (
    document.full_description !== undefined &&
    getCharacterCount(document.full_description) > 4000
  ) {
    issues.push("full_description: must be 4000 characters or fewer");
  }

  if (issues.length > 0) {
    throw new StoremetaError(
      "VALIDATION_ERROR",
      `Google metadata length validation failed: ${issues.join("; ")}`,
    );
  }
}
