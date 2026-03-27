import YAML from "yaml";

function sortMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortMetadataValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, childValue]) => [key, sortMetadataValue(childValue)]),
    );
  }

  return value;
}

export function serializeMetadataDocument(document: unknown): string {
  const serialized = YAML.stringify(sortMetadataValue(document), {
    indent: 2,
    lineWidth: 0,
    minContentWidth: 0,
  });

  return serialized.endsWith("\n") ? serialized : `${serialized}\n`;
}
