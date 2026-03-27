import YAML from "yaml";

export function serializeMetadataDocument(document: unknown): string {
  const serialized = YAML.stringify(document, {
    indent: 2,
    lineWidth: 0,
    minContentWidth: 0,
  });

  return serialized.endsWith("\n") ? serialized : `${serialized}\n`;
}
