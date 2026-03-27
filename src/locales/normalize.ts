function normalizeLocaleSegment(segment: string, index: number): string {
  if (index === 0) {
    return segment.toLowerCase();
  }

  if (segment.length === 4) {
    return `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1).toLowerCase()}`;
  }

  if (/^[A-Za-z]{2}$/.test(segment) || /^\d{3}$/.test(segment)) {
    return segment.toUpperCase();
  }

  return segment.toLowerCase();
}

export function normalizeLocaleCode(locale: string): string {
  const trimmed = locale.trim().replaceAll("_", "-");
  const segments = trimmed.split("-").filter((segment) => segment.length > 0);

  return segments
    .map((segment, index) => normalizeLocaleSegment(segment, index))
    .join("-");
}

export function normalizeLocaleCodes(locales: string[]): string[] {
  return locales.map(normalizeLocaleCode);
}
