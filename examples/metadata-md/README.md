# Markdown Metadata Examples

These files show the supported full-listing Markdown format.

This is the default metadata authoring format for `storemeta`.

The full format specification is in [`../../docs/MARKDOWN_METADATA.md`](../../docs/MARKDOWN_METADATA.md).

The layout is:

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
