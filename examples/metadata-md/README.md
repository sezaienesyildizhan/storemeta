# Markdown Metadata Examples

These files show the proposed full-listing Markdown format.

This format is intended to become the default metadata authoring format for `storemeta`.

Implementation status is tracked in [`../../docs/TODO.md`](../../docs/TODO.md). The full format specification is in [`../../docs/MARKDOWN_METADATA.md`](../../docs/MARKDOWN_METADATA.md).

The suggested shape is:

- one file per platform and locale
- YAML frontmatter for routing metadata
- Markdown headings for editable store listing fields
- plain text section bodies that can be edited comfortably by humans

```text
metadata-md/
  apple/
    en-US.md
    tr.md
  google/
    en-US.md
    tr.md
```
