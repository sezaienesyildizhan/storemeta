export const REDACTED_SECRET = "[REDACTED]";

function hasPresentValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

export function redactSecretValue(
  value: unknown,
  replacement: string = REDACTED_SECRET,
): unknown {
  return hasPresentValue(value) ? replacement : value;
}

export function redactSecretFields(
  record: Record<string, unknown>,
  secretKeys: string[],
  replacement: string = REDACTED_SECRET,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...record };

  for (const key of secretKeys) {
    redacted[key] = redactSecretValue(record[key], replacement);
  }

  return redacted;
}
