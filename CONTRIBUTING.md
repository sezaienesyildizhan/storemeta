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

## Development Workflow

Useful starting points:
- use [`examples/storemeta.yml`](examples/storemeta.yml) for the config shape
- use [`examples/`](examples) for safe sample metadata and screenshot layout
- keep real credentials out of the repository and out of `examples/`

When changing behavior:
- update or add tests
- update README and project docs when command behavior or config changes
- keep commits focused and descriptive

## Security

- never commit App Store Connect private keys
- never commit Google service account JSON files
- never commit real app metadata or production screenshots
- keep example values fake and publish-safe
