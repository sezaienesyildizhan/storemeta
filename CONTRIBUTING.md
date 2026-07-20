# Contributing

## Prerequisites

- Node.js 20 or newer
- npm

## Local Setup

Install dependencies:

```bash
npm install
```

Run the core verification commands:

```bash
npm run check
npm test
npm run build
```

For larger behavior changes, also run:

```bash
npm run coverage
```

## Development Workflow

Useful starting points:
- use [`examples/storemeta.yml`](examples/storemeta.yml) for the config shape
- use [`examples/`](examples) for safe sample metadata and screenshot layout
- keep real credentials out of the repository and out of `examples/`

When changing behavior:
- update or add tests in `tests/`
- update README and project docs when command behavior or config changes
- keep commits focused and descriptive

## Test Policy

Behavior changes require tests.

Add tests for new features, bug fixes, parser rules, validation rules, config behavior, CLI command behavior, platform mappings, and filesystem write behavior. Bug fixes should include a regression test when practical.

Tests live in the centralized [`tests/`](tests) directory and mirror the `src/` domain structure.

Examples:

- config changes: `tests/config/`
- CLI command behavior: `tests/cli/`
- metadata format behavior: `tests/formats/` and `tests/validation/metadata/`
- platform API mapping: `tests/platforms/apple/` or `tests/platforms/google/`
- screenshot filesystem behavior: `tests/validation/screenshots/` or `tests/writers/`

Documentation-only changes do not need tests, but should still pass:

```bash
git diff --check
```

If a behavior change does not include tests, explain why in the PR description.

## Security

- never commit App Store Connect private keys
- never commit Google service account JSON files
- never commit real app metadata or production screenshots
- keep example values fake and publish-safe
